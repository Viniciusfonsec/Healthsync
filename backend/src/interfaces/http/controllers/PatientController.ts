import { BaseController, parse } from './BaseController.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '../middlewares/auth.js';
import { DomainError } from '../../../domain/errors/DomainError.js';
import {
  appointmentCreateSchema,
  rescheduleSchema,
  cancelSchema,
  profilePatchSchema,
} from '../schemas/schemas.js';
import { idParam } from '../schemas/common.js';

/** Área do paciente: consultas, perfil, catálogo e documentos. */
export class PatientController extends BaseController {
  async listAppointments(req: FastifyRequest) {
    return {
      data: await this.scheduling.listPatientAppointments(await this.patientId(req)),
    };
  }

  async createAppointment(req: FastifyRequest, reply: FastifyReply) {
    const body = parse(appointmentCreateSchema, req.body);

    const created = await this.scheduling.createAppointment({
      patientId: await this.patientId(req),
      ...body,
    });

    void this.invites?.sendInviteSafely(created);

    reply.code(201);

    return created;
  }

  async sendAppointmentCalendarEmail(req: FastifyRequest) {
    const { id } = parse(idParam, req.params);
    const patientId = await this.patientId(req);
    const appointment = await this.repos.appointments.findById(id);
    if (!appointment || appointment.patientId !== patientId) {
      throw new DomainError('NOT_FOUND', 'Consulta não encontrada', 404);
    }
    if (!this.invites) {
      throw new DomainError('EMAIL_UNAVAILABLE', 'Envio de e-mail indisponível no momento.', 503);
    }
    return this.invites.sendInvite(appointment);
  }

  async reschedule(req: FastifyRequest) {
    const { id } = parse(idParam, req.params);
    const body = parse(rescheduleSchema, req.body);

    return this.scheduling.reschedule(id, body.dateTime, await this.patientId(req));
  }

  async cancel(req: FastifyRequest) {
    const { id } = parse(idParam, req.params);
    const body = parse(cancelSchema, req.body);

    return this.scheduling.cancel(id, body.reason, await this.patientId(req));
  }

  async confirm(req: FastifyRequest) {
    const { id } = parse(idParam, req.params);

    return this.scheduling.confirm(id, await this.patientId(req));
  }

  async history(req: FastifyRequest) {
    return {
      data: await this.patient.history(await this.patientId(req)),
    };
  }

  async profile(req: FastifyRequest) {
    return this.patient.profile((req.user as AuthUser).userId);
  }

  async updateProfile(req: FastifyRequest) {
    return this.patient.updateProfile((req.user as AuthUser).userId, parse(profilePatchSchema, req.body));
  }

  // =========================================================
  // PACIENTE - CATÁLOGO POR CLÍNICA
  // =========================================================

  async patientClinics() {
    const clinics = await this.repos.clinics.list();

    return {
      data: clinics.filter((clinic) => clinic.active),
    };
  }

  async patientCatalogSpecialties(req: FastifyRequest) {
    const clinicId = await this.activeClinicIdFromQuery(req);

    return {
      data: await this.admin.specialties(clinicId),
    };
  }

  async patientCatalogProfessionals(req: FastifyRequest) {
    const clinicId = await this.activeClinicIdFromQuery(req);

    const professionals = await this.admin.professionals(clinicId);
    return {
      data: await Promise.all(
        professionals.map(async (item) => ({
          ...item,
          availability: (await this.professional.availability(item.id))
            .filter((slot) => slot.active)
            .map(({ dayOfWeek, startTime, endTime, durationMinutes }) => ({
              dayOfWeek,
              startTime,
              endTime,
              durationMinutes,
            })),
        })),
      ),
    };
  }

  async listPatientDocuments(req: FastifyRequest) {
    const { id } = parse(idParam, req.params);
    const patientId = await this.patientId(req);
    const documents = await this.documents.listByPatientAppointment(patientId, id);
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

  async downloadPatientDocument(req: FastifyRequest, reply: FastifyReply) {
    const { id } = parse(idParam, req.params);
    const result = await this.documents.downloadForPatient(id, await this.patientId(req));
    const safeName = result.document.originalName.replace(/[\r\n"\\]/g, '_');
    return reply
      .type(result.document.mimeType)
      .header('Content-Disposition', `attachment; filename="${safeName}"`)
      .send(result.buffer);
  }
}
