import { BaseController, parse } from './BaseController.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '../middlewares/auth.js';
import { patientCreateSchema, settingsUpdateSchema, specialtyCreateSchema } from '../schemas/schemas.js';
import type { SystemSettings } from '../../../domain/entities/types.js';
import { dateRangeQuery } from '../schemas/common.js';

/** A senha do SMTP nunca sai da API: o painel só sabe se ela está configurada. */
function withoutSecrets(settings: SystemSettings) {
  const { password, ...smtp } = settings.smtp;
  return { ...settings, smtp: { ...smtp, hasPassword: Boolean(password) } };
}

/** Administrador da unidade: usuários, especialidades, relatórios e configurações. */
export class AdminController extends BaseController {
  async specialties(req: FastifyRequest) {
    const user = req.user as AuthUser;

    return {
      data: await this.admin.specialties(user.clinicId),
    };
  }

  async professionals(req: FastifyRequest) {
    const user = req.user as AuthUser;

    return {
      data: await this.admin.professionals(user.clinicId),
    };
  }

  async adminDashboard() {
    return this.admin.dashboard();
  }

  async adminUsers(req: FastifyRequest) {
    const user = req.user as AuthUser;

    return {
      data: await this.admin.users(user.clinicId),
    };
  }

  async adminCreatePatient(req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as AuthUser;

    const created = await this.admin.createPatient(
      parse(patientCreateSchema, req.body),
      this.hasher,
      user.clinicId,
    );

    reply.code(201);

    return created;
  }

  async createSpecialty(req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as AuthUser;

    const created = await this.admin.createSpecialty(parse(specialtyCreateSchema, req.body), user.clinicId);

    reply.code(201);

    return created;
  }

  async absences(req: FastifyRequest) {
    const query = parse(dateRangeQuery, req.query);

    return {
      data: await this.reports.absences(
        query.from.toISOString(),
        query.to.toISOString(),
        (req.user as AuthUser).clinicId,
      ),
    };
  }

  async productivity(req: FastifyRequest) {
    const query = parse(dateRangeQuery, req.query);

    return {
      data: await this.reports.productivity(
        query.from.toISOString(),
        query.to.toISOString(),
        (req.user as AuthUser).clinicId,
      ),
    };
  }

  async auditLogs(req: FastifyRequest) {
    const actor = req.user as AuthUser;
    const list = await this.repos.auditLogs.findByActor(actor.userId);

    return {
      data: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async settings() {
    return withoutSecrets(await this.repos.settings.get());
  }

  async updateSettings(req: FastifyRequest) {
    const patch = parse(settingsUpdateSchema, req.body);
    const saved = await this.repos.settings.save({
      ...(await this.repos.settings.get()),
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    await this.adminLog((req.user as AuthUser).userId, 'UPDATE', 'SystemSettings', saved.id);
    return withoutSecrets(saved);
  }
}
