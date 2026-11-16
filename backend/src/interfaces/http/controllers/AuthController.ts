import { clearSessionCookie } from '../session/sessionCookie.js';
import { BaseController, parse } from './BaseController.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '../middlewares/auth.js';
import { DomainError } from '../../../domain/errors/DomainError.js';
import { loginSchema, changePasswordSchema, professionalClinicSelectionSchema } from '../schemas/schemas.js';
import { env } from '../../../config/env.js';

/** Login, escolha de unidade do profissional e dados da conta. */
export class AuthController extends BaseController {
  /** Encerra a sessão do navegador apagando o cookie. */
  async logout(_req: FastifyRequest, reply: FastifyReply) {
    clearSessionCookie(reply);
    return { message: 'Sessão encerrada' };
  }

  async login(req: FastifyRequest, reply: FastifyReply) {
    const body = parse(loginSchema, req.body);
    const user = await this.auth.authenticate(body.email, body.password);

    if (user.role === 'PROFISSIONAL') {
      const clinics = await this.auth.professionalClinics(user.id);
      const selectionToken = await reply.jwtSign(
        {
          userId: user.id,
          role: user.role,
          email: user.email,
          stage: 'CLINIC_SELECTION',
        },
        { expiresIn: env.CLINIC_SELECTION_EXPIRES_IN },
      );

      return {
        requiresClinicSelection: true,
        selectionToken,
        clinics: clinics.map(({ id, name }) => ({ id, name })),
      };
    }

    return this.createAccessSession(reply, user, user.clinicId);
  }

  async selectProfessionalClinic(req: FastifyRequest, reply: FastifyReply) {
    const body = parse(professionalClinicSelectionSchema, req.body);

    let selection: AuthUser;
    try {
      selection = req.server.jwt.verify<AuthUser>(body.selectionToken);
    } catch {
      throw new DomainError('UNAUTHORIZED', 'Sessão de seleção de unidade inválida.', 401);
    }

    if (selection.stage !== 'CLINIC_SELECTION' || selection.role !== 'PROFISSIONAL') {
      throw new DomainError('UNAUTHORIZED', 'Sessão de seleção de unidade inválida.', 401);
    }

    const clinic = await this.auth.validateProfessionalClinic(selection.userId, body.clinicId);
    const user = await this.repos.users.findById(selection.userId);

    if (!user) {
      throw new DomainError('NOT_FOUND', 'Usuário não encontrado', 404);
    }

    await this.adminLog(user.id, 'LOGIN', 'User', user.id);
    return this.createAccessSession(reply, user, clinic.id);
  }

  async switchProfessionalClinic(req: FastifyRequest, reply: FastifyReply) {
    const authUser = req.user as AuthUser;
    const body = parse(professionalClinicSelectionSchema.omit({ selectionToken: true }), req.body);
    const clinic = await this.auth.validateProfessionalClinic(authUser.userId, body.clinicId);
    const user = await this.repos.users.findById(authUser.userId);

    if (!user) {
      throw new DomainError('NOT_FOUND', 'Usuário não encontrado', 404);
    }

    return this.createAccessSession(reply, user, clinic.id);
  }

  async me(req: FastifyRequest) {
    const authUser = req.user as AuthUser;

    const user = await this.repos.users.findById(authUser.userId);

    if (!user) {
      throw new DomainError('NOT_FOUND', 'Usuário não encontrado', 404);
    }

    const displayName = await this.userDisplayName(user.id, user.role, user.email);
    const base = {
      name: displayName,
      email: user.email,
      role: user.role,
      active: user.active,
      clinicId: authUser.clinicId,
    };

    if (user.role === 'PACIENTE') {
      return {
        ...base,
        profile: await this.patient.profile(user.id),
      };
    }

    if (user.role === 'PROFISSIONAL') {
      return {
        ...base,
        clinics: (await this.auth.professionalClinics(user.id)).map(({ id, name }) => ({ id, name })),
        profile: await this.repos.professionals.findByUserId(user.id),
      };
    }

    if (user.role === 'ADMINISTRADOR') {
      return {
        ...base,
        profile: await this.repos.administrators.findByUserId(user.id),
      };
    }

    return { ...base, profile: null };
  }

  async changePassword(req: FastifyRequest) {
    const body = parse(changePasswordSchema, req.body);

    await this.auth.changePassword((req.user as AuthUser).userId, body.currentPassword, body.newPassword);

    return {
      message: 'Senha alterada com sucesso',
    };
  }
}
