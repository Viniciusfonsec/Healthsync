import { clinicIdQuery } from '../schemas/common.js';
import { setSessionCookie, wantsBearerToken } from '../session/sessionCookie.js';
import type { AuditAction } from '../../../domain/entities/types.js';
import type { z } from 'zod';
import type { PasswordHasher } from '../../../infrastructure/crypto/PasswordHasher.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '../middlewares/auth.js';
import { DocumentService } from '../../../application/services/DocumentService.js';
import { DomainError } from '../../../domain/errors/DomainError.js';
import type { AuthService } from '../../../application/services/AuthService.js';
import type { AppointmentInviteService } from '../../../application/services/AppointmentInviteService.js';
import {
  ClinicAdminService,
  ReportService,
  MasterClinicService,
  MasterProfessionalService,
  MasterSpecialtyService,
  MasterAdministratorService,
  NotificationService,
  PatientService,
  ProfessionalService,
  SchedulingService,
} from '../../../application/services/AppServices.js';
import type { Repositories } from '../../../domain/repositories/contracts.js';

/** Valida `value` com o schema zod: devolve os dados já tipados ou lança 422 com os erros por campo. */
export function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new DomainError('VALIDATION_ERROR', 'Dados inválidos', 422, result.error.flatten());
  }

  return result.data;
}

/** Serviços e repositórios usados pelos controllers (montados em app.ts). */
export interface ControllerDeps {
  auth: AuthService;
  scheduling: SchedulingService;
  patient: PatientService;
  notifications: NotificationService;
  professional: ProfessionalService;
  admin: ClinicAdminService;
  reports: ReportService;
  masterClinicService: MasterClinicService;
  masterProfessionalService: MasterProfessionalService;
  masterSpecialtyService: MasterSpecialtyService;
  masterAdministratorService: MasterAdministratorService;
  documents: DocumentService;
  hasher: PasswordHasher;
  repos: Repositories;
  invites?: AppointmentInviteService;
}

/**
 * Base dos controllers HTTP: guarda as dependências e os utilitários comuns
 * (identificar o paciente/profissional logado, registrar auditoria etc.).
 */
export abstract class BaseController {
  protected readonly auth: AuthService;
  protected readonly scheduling: SchedulingService;
  protected readonly patient: PatientService;
  protected readonly notifications: NotificationService;
  protected readonly professional: ProfessionalService;
  protected readonly admin: ClinicAdminService;
  protected readonly reports: ReportService;
  protected readonly masterClinicService: MasterClinicService;
  protected readonly masterProfessionalService: MasterProfessionalService;
  protected readonly masterSpecialtyService: MasterSpecialtyService;
  protected readonly masterAdministratorService: MasterAdministratorService;
  protected readonly documents: DocumentService;
  protected readonly hasher: PasswordHasher;
  protected readonly repos: Repositories;
  protected readonly invites?: AppointmentInviteService;

  constructor(deps: ControllerDeps) {
    this.auth = deps.auth;
    this.scheduling = deps.scheduling;
    this.patient = deps.patient;
    this.notifications = deps.notifications;
    this.professional = deps.professional;
    this.admin = deps.admin;
    this.reports = deps.reports;
    this.masterClinicService = deps.masterClinicService;
    this.masterProfessionalService = deps.masterProfessionalService;
    this.masterSpecialtyService = deps.masterSpecialtyService;
    this.masterAdministratorService = deps.masterAdministratorService;
    this.documents = deps.documents;
    this.hasher = deps.hasher;
    this.repos = deps.repos;
    this.invites = deps.invites;
  }

  /**
   * Abre a sessão de acesso: grava o token no cookie httpOnly e devolve os dados do usuário.
   * O token só vem no corpo quando o cliente pede (`x-auth-mode: token`).
   * A duração vem de "Tempo de sessão" nas configurações do sistema.
   */
  protected async createAccessSession(
    reply: FastifyReply,
    user: { id: number; email: string; role: string },
    clinicId: number,
  ) {
    const displayName = await this.userDisplayName(user.id, user.role, user.email);
    const minutes = (await this.repos.settings.get()).sessionTimeoutMinutes;
    const expiresInSeconds = minutes > 0 ? minutes * 60 : 6 * 60 * 60;
    const token = await reply.jwtSign(
      {
        userId: user.id,
        clinicId,
        role: user.role,
        email: user.email,
        stage: 'ACCESS',
      },
      { expiresIn: expiresInSeconds },
    );
    setSessionCookie(reply, token, expiresInSeconds);

    return {
      ...(wantsBearerToken(reply.request) ? { accessToken: token, tokenType: 'Bearer' } : {}),
      expiresIn: expiresInSeconds,
      user: {
        name: displayName,
        email: user.email,
        role: user.role,
        clinicId,
        ...(user.role === 'PROFISSIONAL'
          ? {
              availableClinics: (await this.auth.professionalClinics(user.id)).map(({ id, name }) => ({
                id,
                name,
              })),
            }
          : {}),
      },
    };
  }

  protected async userDisplayName(userId: number, role: string, fallbackEmail: string) {
    if (role === 'PACIENTE') {
      return (await this.repos.patients.findByUserId(userId))?.name ?? fallbackEmail;
    }
    if (role === 'PROFISSIONAL') {
      return (await this.repos.professionals.findByUserId(userId))?.name ?? fallbackEmail;
    }
    if (role === 'ADMINISTRADOR') {
      return (await this.repos.administrators.findByUserId(userId))?.name ?? fallbackEmail;
    }
    return 'Administrador Master';
  }

  protected async patientId(req: FastifyRequest) {
    const patient = await this.repos.patients.findByUserId((req.user as AuthUser).userId);

    if (!patient) {
      throw new DomainError('NOT_FOUND', 'Paciente não encontrado', 404);
    }

    return patient.id;
  }

  protected async professionalFromUser(req: FastifyRequest) {
    const professional = await this.repos.professionals.findByUserId((req.user as AuthUser).userId);

    if (!professional) {
      throw new DomainError('NOT_FOUND', 'Profissional não encontrado', 404);
    }

    const authUser = req.user as AuthUser;
    const membership = await this.repos.professionalClinics.findByProfessionalAndClinic(
      professional.id,
      authUser.clinicId,
    );

    if (!membership && professional.clinicId !== authUser.clinicId) {
      throw new DomainError('FORBIDDEN', 'O profissional não possui acesso à unidade selecionada.', 403);
    }

    return professional;
  }

  /** Lê ?clinicId=, valida e confirma que a unidade existe e está ativa. */
  protected async activeClinicIdFromQuery(req: FastifyRequest): Promise<number> {
    const { clinicId } = parse(clinicIdQuery, req.query);
    const clinic = await this.repos.clinics.findById(clinicId);
    if (!clinic || !clinic.active) {
      throw new DomainError('NOT_FOUND', 'Unidade não encontrada', 404);
    }
    return clinicId;
  }

  protected async adminLog(actorUserId: number, action: AuditAction, resource: string, resourceId?: number) {
    await this.repos.auditLogs.create({
      actorUserId,
      action,
      resource,
      createdAt: new Date().toISOString(),
      ...(resourceId === undefined ? {} : { resourceId }),
    });
  }
}
