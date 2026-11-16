import type { Repositories } from '../../domain/repositories/contracts.js';
import { conflict, notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';

/** Administrador master: unidades da rede. */
export class MasterClinicService {
  constructor(private readonly r: Repositories) {}

  async list() {
    return this.r.clinics.list();
  }

  async create(input: {
    name: string;
    document?: string;
    phone?: string;
    email?: string;
    address?: {
      cep: string;
      street: string;
      number: string;
      complement?: string;
      district: string;
      city: string;
      state: string;
    };
  }) {
    const existing = await this.r.clinics.findByName(input.name.trim());

    if (existing) {
      throw conflict('Clínica já cadastrada');
    }

    const t = nowIso();

    return this.r.clinics.create({
      name: input.name.trim(),
      document: input.document?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      address: input.address,
      active: true,
      createdAt: t,
      updatedAt: t,
    });
  }

  async update(
    id: number,
    input: {
      name?: string;
      document?: string;
      phone?: string;
      email?: string;
      address?: {
        cep: string;
        street: string;
        number: string;
        complement?: string;
        district: string;
        city: string;
        state: string;
      };
      active?: boolean;
    },
  ) {
    const clinic = await this.r.clinics.findById(id);

    if (!clinic) {
      throw notFound('Unidade não encontrada');
    }

    if (input.name && input.name.trim().toLowerCase() !== clinic.name.trim().toLowerCase()) {
      const existing = await this.r.clinics.findByName(input.name.trim());

      if (existing && existing.id !== id) {
        throw conflict('Clínica já cadastrada');
      }
    }

    return this.r.clinics.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.document !== undefined
        ? {
            document: input.document.trim() || undefined,
          }
        : {}),
      ...(input.phone !== undefined
        ? {
            phone: input.phone.trim() || undefined,
          }
        : {}),
      ...(input.email !== undefined
        ? {
            email: input.email.trim() || undefined,
          }
        : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      updatedAt: nowIso(),
    });
  }
}
