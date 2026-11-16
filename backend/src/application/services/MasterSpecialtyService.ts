import type { Repositories } from '../../domain/repositories/contracts.js';
import { conflict, notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';

/** Administrador master: especialidades de todas as unidades. */
export class MasterSpecialtyService {
  constructor(private readonly r: Repositories) {}

  async list() {
    return this.r.specialties.list();
  }

  async create(input: {
    clinicId: number;
    name: string;
    description?: string;
    icon?: string;
    avgMinutes: number;
  }) {
    const clinic = await this.r.clinics.findById(input.clinicId);

    if (!clinic || !clinic.active) {
      throw notFound('Unidade não encontrada ou inativa');
    }

    const existing = await this.r.specialties.findByName(input.name.trim());

    if (existing) {
      throw conflict('Especialidade já cadastrada');
    }

    const t = nowIso();

    return this.r.specialties.create({
      clinicId: input.clinicId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      icon: input.icon?.trim() || undefined,
      avgMinutes: input.avgMinutes,
      active: true,
      createdAt: t,
      updatedAt: t,
    });
  }

  async update(
    id: number,
    input: {
      clinicId?: number;
      name?: string;
      description?: string;
      icon?: string;
      avgMinutes?: number;
      active?: boolean;
    },
  ) {
    const specialty = await this.r.specialties.findById(id);

    if (!specialty) {
      throw notFound('Especialidade não encontrada');
    }

    const targetClinicId = input.clinicId ?? specialty.clinicId;

    const clinic = await this.r.clinics.findById(targetClinicId);

    if (!clinic || !clinic.active) {
      throw notFound('Unidade não encontrada ou inativa');
    }

    if (input.name && input.name.trim().toLowerCase() !== specialty.name.trim().toLowerCase()) {
      const existing = await this.r.specialties.findByName(input.name.trim());

      if (existing && existing.id !== specialty.id) {
        throw conflict('Especialidade já cadastrada');
      }
    }

    return this.r.specialties.update(id, {
      ...(input.clinicId !== undefined
        ? {
            clinicId: input.clinicId,
          }
        : {}),
      ...(input.name !== undefined
        ? {
            name: input.name.trim(),
          }
        : {}),
      ...(input.description !== undefined
        ? {
            description: input.description.trim() || undefined,
          }
        : {}),
      ...(input.icon !== undefined
        ? {
            icon: input.icon.trim() || undefined,
          }
        : {}),
      ...(input.avgMinutes !== undefined
        ? {
            avgMinutes: input.avgMinutes,
          }
        : {}),
      ...(input.active !== undefined
        ? {
            active: input.active,
          }
        : {}),
      updatedAt: nowIso(),
    });
  }
}
