import { ensurePasswordPolicy } from './passwordPolicy.js';
import type { Repositories } from '../../domain/repositories/contracts.js';
import type { Clinic, User } from '../../domain/entities/types.js';
import { forbidden, notFound, unauthorized } from '../../domain/errors/DomainError.js';
import type { PasswordHasher } from '../../infrastructure/crypto/PasswordHasher.js';
import { env } from '../../config/env.js';

export class AuthService {
  constructor(
    private readonly repos: Repositories,
    private readonly hasher: PasswordHasher,
  ) {}

  async authenticate(email: string, password: string): Promise<User> {
    const user = await this.repos.users.findByEmail(email);

    if (!user) {
      throw unauthorized('Credenciais inválidas.');
    }

    const now = Date.now();
    const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil).getTime() : 0;

    if (lockedUntil > now) {
      const minutes = Math.max(1, Math.ceil((lockedUntil - now) / 60_000));
      throw forbidden(`Conta temporariamente bloqueada. Tente novamente em ${minutes} minuto(s).`);
    }

    if (!user.active || user.isGuest) {
      throw unauthorized('Credenciais inválidas.');
    }

    const passwordMatches = await this.hasher.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;

      if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
        const lockedUntilDate = new Date(now + env.LOGIN_LOCK_MINUTES * 60_000);

        await this.repos.users.update(user.id, {
          failedLoginAttempts: 0,
          lockedUntil: lockedUntilDate.toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await this.repos.auditLogs.create({
          actorUserId: user.id,
          action: 'STATUS_CHANGE',
          resource: 'User',
          resourceId: user.id,
          metadata: {
            event: 'LOGIN_LOCKED',
            durationMinutes: env.LOGIN_LOCK_MINUTES,
          },
          createdAt: new Date().toISOString(),
        });

        throw forbidden(
          `Limite de tentativas excedido. Conta bloqueada por ${env.LOGIN_LOCK_MINUTES} minuto(s).`,
        );
      }

      await this.repos.users.update(user.id, {
        failedLoginAttempts: attempts,
        updatedAt: new Date().toISOString(),
      });

      throw unauthorized('Credenciais inválidas.');
    }

    return this.repos.users.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    });
  }

  async professionalClinics(userId: number): Promise<Clinic[]> {
    const professional = await this.repos.professionals.findByUserId(userId);

    if (!professional) {
      throw notFound('Profissional não encontrado');
    }

    const memberships = await this.repos.professionalClinics.findByProfessionalId(professional.id);

    const clinicIds = new Set(memberships.map((membership) => membership.clinicId));

    // Mantém compatibilidade com profissionais antigos que ainda não
    // possuem registros na tabela de vínculo.
    clinicIds.add(professional.clinicId);

    const clinics = [];
    for (const clinicId of clinicIds) {
      const clinic = await this.repos.clinics.findById(clinicId);
      if (clinic?.active) {
        clinics.push(clinic);
      }
    }

    return clinics.sort((a, b) => a.name.localeCompare(b.name));
  }

  async validateProfessionalClinic(userId: number, clinicId: number): Promise<Clinic> {
    const professional = await this.repos.professionals.findByUserId(userId);

    if (!professional) {
      throw notFound('Profissional não encontrado');
    }

    const membership = await this.repos.professionalClinics.findByProfessionalAndClinic(
      professional.id,
      clinicId,
    );

    if (!membership && professional.clinicId !== clinicId) {
      throw forbidden('O profissional não possui acesso à unidade selecionada.');
    }

    const clinic = await this.repos.clinics.findById(clinicId);

    if (!clinic || !clinic.active) {
      throw notFound('Unidade não encontrada ou inativa');
    }

    return clinic;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.repos.users.findById(userId);

    if (!user) {
      throw notFound('Usuário não encontrado');
    }

    if (!(await this.hasher.compare(currentPassword, user.passwordHash))) {
      throw unauthorized('Senha atual inválida');
    }

    await ensurePasswordPolicy(this.repos, newPassword);

    await this.repos.users.update(userId, {
      passwordHash: await this.hasher.hash(newPassword),
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    });
  }
}
