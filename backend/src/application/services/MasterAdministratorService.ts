import type { Repositories } from '../../domain/repositories/contracts.js';
import { ensurePasswordPolicy } from './passwordPolicy.js';
import { conflict, notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';

/** Administrador master: administradores das unidades. */
export class MasterAdministratorService {
  constructor(private readonly r: Repositories) {}

  async list() {
    const [administrators, users] = await Promise.all([this.r.administrators.list(), this.r.users.list()]);

    return administrators.map((administrator) => {
      const user = users.find((item) => item.id === administrator.userId);

      return {
        ...administrator,
        clinicId: user?.clinicId ?? '',
        email: user?.email ?? '',
        active: user?.active ?? false,
      };
    });
  }

  async create(
    input: {
      clinicId: number;
      name: string;
      email: string;
      password: string;
    },
    hasher: {
      hash(value: string): Promise<string>;
    },
  ) {
    return this.r.transaction((repos) => new MasterAdministratorService(repos).createSteps(input, hasher));
  }
  /** Passos de `masterCreateAdministrator`; sempre executados dentro de uma transação. */

  private async createSteps(
    input: {
      clinicId: number;
      name: string;
      email: string;
      password: string;
    },
    hasher: {
      hash(value: string): Promise<string>;
    },
  ) {
    await ensurePasswordPolicy(this.r, input.password);
    const clinic = await this.r.clinics.findById(input.clinicId);

    if (!clinic || !clinic.active) {
      throw notFound('Unidade não encontrada ou inativa');
    }

    const existing = await this.r.users.findByEmailAndClinic(input.email, input.clinicId);

    if (existing) {
      throw conflict('E-mail já cadastrado');
    }

    const t = nowIso();

    const user = await this.r.users.create({
      clinicId: input.clinicId,
      role: 'ADMINISTRADOR',
      email: input.email.trim(),
      passwordHash: await hasher.hash(input.password),
      active: true,
      createdAt: t,
      updatedAt: t,
    });

    return this.r.administrators.create({
      userId: user.id,
      name: input.name.trim(),
      createdAt: t,
      updatedAt: t,
    });
  }

  async update(
    id: number,
    input: {
      clinicId?: number;
      name?: string;
      email?: string;
      active?: boolean;
    },
  ) {
    return this.r.transaction((repos) => new MasterAdministratorService(repos).updateSteps(id, input));
  }
  /** Passos de `masterUpdateAdministrator`; sempre executados dentro de uma transação. */

  private async updateSteps(
    id: number,
    input: {
      clinicId?: number;
      name?: string;
      email?: string;
      active?: boolean;
    },
  ) {
    const administrator = await this.r.administrators.findById(id);

    if (!administrator) {
      throw notFound('Administrador não encontrado');
    }

    const user = await this.r.users.findById(administrator.userId);

    if (!user) {
      throw notFound('Usuário do administrador não encontrado');
    }

    if (input.clinicId) {
      const clinic = await this.r.clinics.findById(input.clinicId);

      if (!clinic || !clinic.active) {
        throw notFound('Unidade não encontrada ou inativa');
      }
    }

    if (input.email && input.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      const existing = await this.r.users.findByEmailAndClinic(
        input.email.trim(),
        input.clinicId ?? user.clinicId,
      );

      if (existing && existing.id !== user.id) {
        throw conflict('E-mail já cadastrado');
      }
    }

    const updated = await this.r.administrators.update(id, {
      ...(input.name !== undefined
        ? {
            name: input.name.trim(),
          }
        : {}),
      updatedAt: nowIso(),
    });

    await this.r.users.update(user.id, {
      ...(input.clinicId !== undefined
        ? {
            clinicId: input.clinicId,
          }
        : {}),
      ...(input.email !== undefined
        ? {
            email: input.email.trim(),
          }
        : {}),
      ...(input.active !== undefined
        ? {
            active: input.active,
          }
        : {}),
      updatedAt: nowIso(),
    });

    return updated;
  }
}
