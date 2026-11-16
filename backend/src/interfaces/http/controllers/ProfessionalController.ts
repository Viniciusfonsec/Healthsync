import { BaseController, parse } from './BaseController.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '../middlewares/auth.js';
import { DomainError } from '../../../domain/errors/DomainError.js';
import {
  availabilitySchema,
  blockSchema,
  durationSchema,
  attendanceCreateSchema,
  attendanceStatusSchema,
  documentUploadQuerySchema,
  patientCpfParam,
} from '../schemas/schemas.js';
import { idParam, dateRangeQuery } from '../schemas/common.js';

/** Área do profissional: agenda, atendimentos, faltas e documentos. */
export class ProfessionalController extends BaseController {
  async agenda(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);

    const query = parse(dateRangeQuery, req.query);

    const appointments = await this.professional.agenda(
      professional.id,
      query.from.toISOString(),
      query.to.toISOString(),
      (req.user as AuthUser).clinicId,
    );
    return {
      data: await Promise.all(
        appointments.map(async (appointment) => {
          const patient = await this.repos.patients.findById(appointment.patientId);
          return {
            ...appointment,
            patient: patient
              ? {
                  name: patient.name,
                  email: patient.email,
                  phone: patient.phone,
                  cpf: patient.cpf,
                  birthDate: patient.birthDate,
                  gender: patient.gender,
                  bloodType: patient.bloodType,
                  plan: patient.plan,
                  priorities: patient.priorities ?? [],
                }
              : undefined,
          };
        }),
      ),
    };
  }

  async availability(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);

    return {
      data: await this.professional.availability(professional.id),
    };
  }

  async saveAvailability(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);

    const body = parse(availabilitySchema, req.body);

    return {
      data: await this.professional.saveAvailability(professional.id, body.slots),
    };
  }

  async block(req: FastifyRequest, reply: FastifyReply) {
    const professional = await this.professionalFromUser(req);

    const body = parse(blockSchema, req.body);

    const created = await this.professional.blockAgenda(
      professional.id,
      body.startsAt,
      body.endsAt,
      body.reason,
    );

    reply.code(201);

    return created;
  }

  async duration(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);

    const body = parse(durationSchema, req.body);

    return this.professional.duration(professional.id, body.minutes);
  }

  async professionalAppointment(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);
    const actor = req.user as AuthUser;
    const { id } = parse(idParam, req.params);
    return this.professional.appointmentById(professional.id, actor.clinicId, id);
  }

  async markNoShow(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);
    const actor = req.user as AuthUser;
    const { id } = parse(idParam, req.params);
    return this.professional.markNoShow(professional.id, actor.clinicId, id);
  }

  async professionalHistory(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);
    const actor = req.user as AuthUser;
    return { data: await this.professional.history(professional.id, actor.clinicId) };
  }

  async patientHistory(req: FastifyRequest) {
    const { cpf } = parse(patientCpfParam, req.params);

    return this.professional.findPatientHistory(cpf, (req.user as AuthUser).clinicId);
  }

  async registerAttendance(req: FastifyRequest, reply: FastifyReply) {
    const professional = await this.professionalFromUser(req);

    const { id } = parse(idParam, req.params);

    const created = await this.professional.createAttendance(
      professional.id,
      (req.user as AuthUser).clinicId,
      id,
      parse(attendanceCreateSchema, req.body),
    );

    reply.code(201);

    return created;
  }

  async statusAttendance(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);

    const { id } = parse(idParam, req.params);

    const body = parse(attendanceStatusSchema, req.body);

    return this.professional.updateAttendanceStatus(
      professional.id,
      (req.user as AuthUser).clinicId,
      id,
      body.status,
    );
  }

  async downloadProfessionalDocument(req: FastifyRequest, reply: FastifyReply) {
    const { id } = parse(idParam, req.params);
    const professional = await this.professionalFromUser(req);
    const actor = req.user as AuthUser;
    const result = await this.documents.downloadForProfessional(id, professional.id, actor.clinicId);
    const safeName = result.document.originalName.replace(/[\r\n"\\]/g, '_');
    return reply
      .type(result.document.mimeType)
      .header('Content-Disposition', `attachment; filename="${safeName}"`)
      .send(result.buffer);
  }

  async uploadDocument(req: FastifyRequest) {
    const authUser = req.user as AuthUser;
    const professional = await this.professionalFromUser(req);
    const { id } = parse(idParam, req.params);
    const query = parse(documentUploadQuerySchema, req.query);
    const file = await req.file();

    if (!file) {
      throw new DomainError('VALIDATION_ERROR', 'Arquivo é obrigatório', 422);
    }

    const buffer = await file.toBuffer();
    const document = await this.documents.upload({
      professionalId: professional.id,
      clinicId: authUser.clinicId,
      uploaderUserId: authUser.userId,
      appointmentId: id,
      originalName: file.filename,
      mimeType: file.mimetype,
      buffer,
      type: query.type,
    });

    await this.adminLog(authUser.userId, 'UPLOAD', 'Document', document.id);

    return {
      document: {
        id: document.id,
        fileName: document.originalName,
        type: document.type,
        mimeType: document.mimeType,
        size: document.size,
        createdAt: document.createdAt,
      },
      message: 'Documento anexado com sucesso',
    };
  }

  async listDocuments(req: FastifyRequest) {
    const professional = await this.professionalFromUser(req);
    const authUser = req.user as AuthUser;
    const { id } = parse(idParam, req.params);
    const documents = await this.documents.listByAppointment(professional.id, authUser.clinicId, id);

    return {
      data: documents.map((document) => ({
        id: document.id,
        fileName: document.originalName,
        type: document.type,
        mimeType: document.mimeType,
        size: document.size,
        createdAt: document.createdAt,
      })),
    };
  }
}
