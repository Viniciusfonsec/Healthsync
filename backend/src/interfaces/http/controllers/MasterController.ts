import { BaseController, parse } from './BaseController.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '../middlewares/auth.js';
import {
  masterClinicCreateSchema,
  masterClinicUpdateSchema,
  masterClinicIdParam,
  masterProfessionalCreateSchema,
  masterProfessionalUpdateSchema,
  masterSpecialtyCreateSchema,
  masterSpecialtyUpdateSchema,
  masterAdministratorCreateSchema,
  masterAdministratorUpdateSchema,
} from '../schemas/schemas.js';
import { idParam } from '../schemas/common.js';

/** Administrador master: unidades, profissionais, especialidades e administradores da rede. */
export class MasterController extends BaseController {
  async masterAuditLogs(req: FastifyRequest) {
    const actor = req.user as AuthUser;
    const list = await this.repos.auditLogs.findByActor(actor.userId);
    return {
      data: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  // =========================================================
  // ADMIN MASTER
  // =========================================================

  async masterClinics() {
    return {
      data: await this.masterClinicService.list(),
    };
  }

  async masterCreateClinic(req: FastifyRequest, reply: FastifyReply) {
    const created = await this.masterClinicService.create(parse(masterClinicCreateSchema, req.body));

    const actor = req.user as AuthUser;
    await this.adminLog(actor.userId, 'CREATE', 'Clinic', created.id);
    reply.code(201);
    return created;
  }

  async masterUpdateClinic(req: FastifyRequest) {
    const params = parse(masterClinicIdParam, req.params);

    const updated = await this.masterClinicService.update(
      params.id,
      parse(masterClinicUpdateSchema, req.body),
    );
    await this.adminLog((req.user as AuthUser).userId, 'UPDATE', 'Clinic', params.id);
    return updated;
  }

  // =========================================================
  // ADMIN MASTER - PROFISSIONAIS
  // =========================================================

  async masterProfessionals() {
    return {
      data: await this.masterProfessionalService.list(),
    };
  }

  async masterCreateProfessional(req: FastifyRequest, reply: FastifyReply) {
    const created = await this.masterProfessionalService.create(
      parse(masterProfessionalCreateSchema, req.body),
      this.hasher,
    );

    const actor = req.user as AuthUser;
    await this.adminLog(actor.userId, 'CREATE', 'Professional', created.id);
    reply.code(201);
    return created;
  }

  async masterUpdateProfessional(req: FastifyRequest) {
    const params = parse(idParam, req.params);

    const updated = await this.masterProfessionalService.update(
      params.id,
      parse(masterProfessionalUpdateSchema, req.body),
    );
    await this.adminLog((req.user as AuthUser).userId, 'UPDATE', 'Professional', params.id);
    return updated;
  }

  // =========================================================
  // ADMIN MASTER - ESPECIALIDADES
  // =========================================================

  async masterSpecialties() {
    return {
      data: await this.masterSpecialtyService.list(),
    };
  }

  async masterCreateSpecialty(req: FastifyRequest, reply: FastifyReply) {
    const created = await this.masterSpecialtyService.create(parse(masterSpecialtyCreateSchema, req.body));

    const actor = req.user as AuthUser;
    await this.adminLog(actor.userId, 'CREATE', 'Specialty', created.id);
    reply.code(201);
    return created;
  }

  async masterUpdateSpecialty(req: FastifyRequest) {
    const params = parse(idParam, req.params);

    const updated = await this.masterSpecialtyService.update(
      params.id,
      parse(masterSpecialtyUpdateSchema, req.body),
    );
    await this.adminLog((req.user as AuthUser).userId, 'UPDATE', 'Specialty', params.id);
    return updated;
  }

  // =========================================================
  // ADMIN MASTER - ADMINISTRADORES
  // =========================================================

  async masterAdministrators() {
    return {
      data: await this.masterAdministratorService.list(),
    };
  }

  async masterCreateAdministrator(req: FastifyRequest, reply: FastifyReply) {
    const created = await this.masterAdministratorService.create(
      parse(masterAdministratorCreateSchema, req.body),
      this.hasher,
    );

    const actor = req.user as AuthUser;
    await this.adminLog(actor.userId, 'CREATE', 'Administrator', created.id);
    reply.code(201);
    return created;
  }

  async masterUpdateAdministrator(req: FastifyRequest) {
    const params = parse(idParam, req.params);

    const updated = await this.masterAdministratorService.update(
      params.id,
      parse(masterAdministratorUpdateSchema, req.body),
    );
    await this.adminLog((req.user as AuthUser).userId, 'UPDATE', 'Administrator', params.id);
    return updated;
  }
}
