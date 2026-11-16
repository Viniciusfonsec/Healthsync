import type { Repositories } from '../../domain/repositories/contracts.js';
import { ensurePasswordPolicy } from './passwordPolicy.js';
import { conflict, forbidden, notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';

/** Administrador master: profissionais e seus vínculos com as unidades. */
export class MasterProfessionalService {
  constructor(private readonly r: Repositories) {}

  async list() {
    const [professionals, memberships] = await Promise.all([
      this.r.professionals.list(),
      this.r.professionalClinics.list(),
    ]);

    return professionals.map((professional) => ({
      ...professional,
      clinicIds: [
        ...new Set([
          professional.clinicId,
          ...memberships
            .filter((membership) => membership.professionalId === professional.id && membership.active)
            .map((membership) => membership.clinicId),
        ]),
      ],
    }));
  }

  async create(
    input: {
      clinicId: number;
      clinicIds?: number[];
      allClinics?: boolean;
      name: string;
      email: string;
      phone: string;
      crm: string;
      specialties: number[];
      consultationDurationMinutes: number;
      password: string;
    },
    hasher: {
      hash(value: string): Promise<string>;
    },
  ) {
    return this.r.transaction((repos) => new MasterProfessionalService(repos).createSteps(input, hasher));
  }
  /** Passos de `masterCreateProfessional`; sempre executados dentro de uma transação. */

  private async createSteps(
    input: {
      clinicId: number;
      clinicIds?: number[];
      allClinics?: boolean;
      name: string;
      email: string;
      phone: string;
      crm: string;
      specialties: number[];
      consultationDurationMinutes: number;
      password: string;
    },
    hasher: {
      hash(value: string): Promise<string>;
    },
  ) {
    await ensurePasswordPolicy(this.r, input.password);
    const allClinics = (await this.r.clinics.list()).filter((clinic) => clinic.active);
    const selectedClinicIds = [
      ...new Set(
        input.allClinics
          ? allClinics.map((clinic) => clinic.id)
          : (input.clinicIds?.length ? input.clinicIds : [input.clinicId]).concat(input.clinicId),
      ),
    ];

    const clinicMap = new Map(allClinics.map((clinic) => [clinic.id, clinic]));
    for (const clinicId of selectedClinicIds) {
      if (!clinicMap.has(clinicId)) {
        throw notFound(`Clínica ${clinicId} não encontrada ou inativa`);
      }
    }
    if (!selectedClinicIds.includes(input.clinicId)) selectedClinicIds.unshift(input.clinicId);
    if (!clinicMap.has(input.clinicId)) throw notFound('Unidade principal não encontrada ou inativa');

    const existingEmail = await this.r.users.findByEmailAndClinic(input.email, input.clinicId);
    if (existingEmail) throw conflict('E-mail já cadastrado');

    const existingCrm = await this.r.professionals.findByCrm(input.crm);
    if (existingCrm) throw conflict('CRM já cadastrado');

    const uniqueSpecialties = [...new Set(input.specialties)];
    for (const specialtyId of uniqueSpecialties) {
      const specialty = await this.r.specialties.findById(specialtyId);
      if (!specialty) throw notFound(`Especialidade ${specialtyId} não encontrada`);
      if (!selectedClinicIds.includes(specialty.clinicId)) {
        throw forbidden('A especialidade precisa pertencer a uma das clínicas vinculadas ao profissional');
      }
      if (!specialty.active) throw conflict('Uma das especialidades está inativa');
    }

    const t = nowIso();
    const user = await this.r.users.create({
      clinicId: input.clinicId,
      role: 'PROFISSIONAL',
      email: input.email.trim().toLowerCase(),
      passwordHash: await hasher.hash(input.password),
      active: true,
      createdAt: t,
      updatedAt: t,
    });

    const professional = await this.r.professionals.create({
      userId: user.id,
      clinicId: input.clinicId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      crm: input.crm.trim(),
      specialties: uniqueSpecialties,
      active: true,
      consultationDurationMinutes: input.consultationDurationMinutes,
      createdAt: t,
      updatedAt: t,
    });

    for (const clinicId of selectedClinicIds) {
      await this.r.professionalClinics.create({
        professionalId: professional.id,
        clinicId,
        active: true,
        createdAt: t,
        updatedAt: t,
      });
    }

    // Novos profissionais recebem uma disponibilidade inicial nos dias úteis.
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await this.r.availabilities.create({
        professionalId: professional.id,
        dayOfWeek,
        startTime: '08:00',
        endTime: '17:00',
        durationMinutes: input.consultationDurationMinutes,
        active: true,
      });
    }

    return { ...professional, clinicIds: selectedClinicIds };
  }

  async update(
    id: number,
    input: {
      clinicId?: number;
      clinicIds?: number[];
      allClinics?: boolean;
      name?: string;
      email?: string;
      phone?: string;
      crm?: string;
      specialties?: number[];
      consultationDurationMinutes?: number;
      active?: boolean;
    },
  ) {
    return this.r.transaction((repos) => new MasterProfessionalService(repos).updateSteps(id, input));
  }
  /** Passos de `masterUpdateProfessional`; sempre executados dentro de uma transação. */

  private async updateSteps(
    id: number,
    input: {
      clinicId?: number;
      clinicIds?: number[];
      allClinics?: boolean;
      name?: string;
      email?: string;
      phone?: string;
      crm?: string;
      specialties?: number[];
      consultationDurationMinutes?: number;
      active?: boolean;
    },
  ) {
    const professional = await this.r.professionals.findById(id);
    if (!professional) throw notFound('Profissional não encontrado');

    const user = await this.r.users.findById(professional.userId);
    if (!user) throw notFound('Usuário do profissional não encontrado');

    const primaryClinicId = input.clinicId ?? professional.clinicId;
    const allClinics = (await this.r.clinics.list()).filter((clinic) => clinic.active);
    const clinicMap = new Map(allClinics.map((clinic) => [clinic.id, clinic]));
    if (!clinicMap.has(primaryClinicId)) throw notFound('Unidade principal não encontrada ou inativa');

    const existingMemberships = await this.r.professionalClinics.list();
    const currentClinicIds = existingMemberships
      .filter((membership) => membership.professionalId === id && membership.active)
      .map((membership) => membership.clinicId);
    const selectedClinicIds = [
      ...new Set(
        input.allClinics
          ? allClinics.map((clinic) => clinic.id)
          : input.clinicIds !== undefined
            ? [...input.clinicIds, primaryClinicId]
            : [...currentClinicIds, primaryClinicId],
      ),
    ];

    for (const clinicId of selectedClinicIds) {
      if (!clinicMap.has(clinicId)) throw notFound(`Clínica ${clinicId} não encontrada ou inativa`);
    }

    const normalizedEmail = (input.email ?? user.email).trim().toLowerCase();
    if (normalizedEmail !== user.email.trim().toLowerCase() || primaryClinicId !== user.clinicId) {
      const existing = await this.r.users.findByEmailAndClinic(normalizedEmail, primaryClinicId);
      if (existing && existing.id !== user.id)
        throw conflict('E-mail já cadastrado na clínica principal selecionada');
    }

    if (input.crm && input.crm.trim().toLowerCase() !== professional.crm.trim().toLowerCase()) {
      const existing = await this.r.professionals.findByCrm(input.crm.trim());
      if (existing && existing.id !== professional.id) throw conflict('CRM já cadastrado');
    }

    if (input.specialties) {
      const uniqueSpecialties = [...new Set(input.specialties)];
      for (const specialtyId of uniqueSpecialties) {
        const specialty = await this.r.specialties.findById(specialtyId);
        if (!specialty) throw notFound(`Especialidade ${specialtyId} não encontrada`);
        if (!selectedClinicIds.includes(specialty.clinicId)) {
          throw forbidden('A especialidade precisa pertencer a uma das clínicas vinculadas ao profissional');
        }
        if (!specialty.active) throw conflict('Uma das especialidades está inativa');
      }
      input.specialties = uniqueSpecialties;
    }

    const updated = await this.r.professionals.update(id, {
      clinicId: primaryClinicId,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.crm !== undefined ? { crm: input.crm.trim() } : {}),
      ...(input.specialties !== undefined ? { specialties: input.specialties } : {}),
      ...(input.consultationDurationMinutes !== undefined
        ? { consultationDurationMinutes: input.consultationDurationMinutes }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      updatedAt: nowIso(),
    });

    await this.r.users.update(user.id, {
      clinicId: primaryClinicId,
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      updatedAt: nowIso(),
    });

    const currentMemberships = existingMemberships.filter((membership) => membership.professionalId === id);
    for (const membership of currentMemberships) {
      const shouldBeActive = selectedClinicIds.includes(membership.clinicId);
      if (membership.active !== shouldBeActive) {
        await this.r.professionalClinics.update(membership.id, {
          active: shouldBeActive,
          updatedAt: nowIso(),
        });
      }
    }
    for (const clinicId of selectedClinicIds) {
      const existing = currentMemberships.find((membership) => membership.clinicId === clinicId);
      if (!existing) {
        await this.r.professionalClinics.create({
          professionalId: id,
          clinicId,
          active: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
    }

    return { ...updated, clinicIds: selectedClinicIds };
  }
}
