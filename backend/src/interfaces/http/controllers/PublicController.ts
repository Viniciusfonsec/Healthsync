import { BaseController, parse } from './BaseController.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { DomainError } from '../../../domain/errors/DomainError.js';
import { publicAppointmentCreateSchema, publicAvailabilityQuerySchema } from '../schemas/schemas.js';

/** Agendamento sem login (catálogo, horários livres e criação da consulta). */
export class PublicController extends BaseController {
  async publicClinics() {
    return { data: (await this.repos.clinics.list()).filter((clinic) => clinic.active) };
  }

  async publicCatalogSpecialties(req: FastifyRequest) {
    const clinicId = await this.activeClinicIdFromQuery(req);
    return {
      data: (await this.admin.specialties(clinicId))
        .filter((specialty) => specialty.active)
        .map(({ id, name, description, icon, avgMinutes, active }) => ({
          id,
          name,
          description,
          icon,
          avgMinutes,
          active,
        })),
    };
  }

  async publicCatalogProfessionals(req: FastifyRequest) {
    const clinicId = await this.activeClinicIdFromQuery(req);
    const professionals = (await this.admin.professionals(clinicId)).filter(
      (professional) => professional.active,
    );
    return {
      data: await Promise.all(
        professionals.map(async ({ id, name, crm, specialties, consultationDurationMinutes, active }) => ({
          id,
          name,
          crm,
          specialties,
          consultationDurationMinutes,
          active,
          availability: (await this.professional.availability(id))
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

  async publicAvailability(req: FastifyRequest) {
    const query = parse(publicAvailabilityQuerySchema, req.query);
    const professional = await this.repos.professionals.findById(query.professionalId);
    if (!professional || !professional.active)
      throw new DomainError('NOT_FOUND', 'Profissional não encontrado', 404);
    return {
      data: await this.scheduling.availableSlots(query.professionalId, `${query.date}T12:00:00.000Z`),
    };
  }

  async createPublicAppointment(req: FastifyRequest, reply: FastifyReply) {
    const body = parse(publicAppointmentCreateSchema, req.body);
    const created = await this.scheduling.createPublicAppointment(body, this.hasher);
    // Envia o resumo com o convite da agenda (.ics) para o e-mail informado.
    // Falha no envio não impede o agendamento.
    void this.invites?.sendInviteSafely(created);
    reply.code(201);
    return {
      appointment: {
        id: created.id,
        dateTime: created.dateTime,
        durationMinutes: created.durationMinutes,
        type: created.type,
        location: created.location,
        status: created.status,
        teleconsultationUrl: created.teleconsultationUrl,
        clinicId: created.clinicId,
      },
      message: 'Consulta agendada com sucesso.',
    };
  }
}
