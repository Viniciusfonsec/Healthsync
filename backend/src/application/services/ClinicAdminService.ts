import type { Repositories } from '../../domain/repositories/contracts.js';
import { ensurePasswordPolicy } from './passwordPolicy.js';
import { conflict } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';
import type { PasswordHasher } from '../../infrastructure/crypto/PasswordHasher.js';
import type { PatientCreateInput, SpecialtyCreateInput } from './dtos.js';

/** Administração da unidade: usuários, pacientes, especialidades, profissionais e painel. */
export class ClinicAdminService {
  constructor(private readonly r: Repositories) {}

  async users(clinicId: number) {
    const users = (await this.r.users.list()).filter((user) => user.clinicId === clinicId);
    const result = await Promise.all(
      users.map(async (user) => {
        let name = user.email;
        if (user.role === 'PACIENTE') {
          const profile = await this.r.patients.findByUserId(user.id);
          name = profile?.name ?? name;
        } else if (user.role === 'PROFISSIONAL') {
          const profile = await this.r.professionals.findByUserId(user.id);
          name = profile?.name ?? name;
        } else if (user.role === 'ADMINISTRADOR') {
          const profile = await this.r.administrators.findByUserId(user.id);
          name = profile?.name ?? name;
        }
        const clinic = await this.r.clinics.findById(user.clinicId);
        return {
          name,
          email: user.email,
          role: user.role,
          active: user.active,
          clinicName: clinic?.name ?? 'Unidade não identificada',
        };
      }),
    );
    return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async createPatient(input: PatientCreateInput, hasher: PasswordHasher, clinicId: number) {
    return this.r.transaction((repos) =>
      new ClinicAdminService(repos).createPatientSteps(input, hasher, clinicId),
    );
  }
  /** Passos de `createPatient`; sempre executados dentro de uma transação. */

  private async createPatientSteps(input: PatientCreateInput, hasher: PasswordHasher, clinicId: number) {
    await ensurePasswordPolicy(this.r, input.password);
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedCpf = input.cpf.replace(/\D/g, '');
    const existing = await this.r.users.findByEmailAndClinic(normalizedEmail, clinicId);
    if (existing) {
      throw conflict('E-mail já cadastrado nesta unidade');
    }
    const existingCpf = await this.r.patients.findByCpf(normalizedCpf);
    if (existingCpf) {
      throw conflict('CPF já cadastrado');
    }
    const t = nowIso();
    const user = await this.r.users.create({
      clinicId,
      role: 'PACIENTE',
      email: normalizedEmail,
      passwordHash: await hasher.hash(input.password),
      active: true,
      createdAt: t,
      updatedAt: t,
    });
    const patient = await this.r.patients.create({
      userId: user.id,
      name: input.name.trim(),
      email: normalizedEmail,
      phone: input.phone.trim(),
      cpf: normalizedCpf,
      birthDate: input.birthDate.trim(),
      gender: input.gender.trim(),
      bloodType: input.bloodType?.trim() || undefined,
      plan: input.plan?.trim() || undefined,
      priorities: input.priorities ?? [],
      createdAt: t,
      updatedAt: t,
    });
    await this.r.patientClinics.create({
      patientId: patient.id,
      clinicId,
      active: true,
      createdAt: t,
      updatedAt: t,
    });
    return patient;
  }

  async specialties(clinicId: number) {
    const specialties = await this.r.specialties.list();
    return specialties.filter((specialty) => specialty.clinicId === clinicId);
  }

  async createSpecialty(input: SpecialtyCreateInput, clinicId: number) {
    if (await this.r.specialties.findByName(input.name)) {
      throw conflict('Especialidade já cadastrada');
    }
    return this.r.specialties.create({
      clinicId,
      ...input,
      active: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  async professionals(clinicId: number) {
    const professionals = await this.r.professionals.list();
    const memberships = await this.r.professionalClinics.findByClinicId(clinicId);
    const memberIds = new Set(memberships.map((membership) => membership.professionalId));
    return professionals.filter(
      (professional) => professional.clinicId === clinicId || memberIds.has(professional.id),
    );
  }

  async dashboard() {
    const appointments = await this.r.appointments.list();
    const attendances = await this.r.attendances.list();
    const users = await this.r.users.list();
    return {
      totalUsers: users.length,
      totalAppointments: appointments.length,
      totalAttendances: attendances.length,
      attendanceRate: appointments.length ? attendances.length / appointments.length : 0,
    };
  }
  /** US018: faltas no período, somente da unidade do administrador. */
}
