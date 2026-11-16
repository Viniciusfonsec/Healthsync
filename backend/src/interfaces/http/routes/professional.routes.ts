import type { FastifyInstance } from 'fastify';
import type { ProfessionalController } from '../controllers/ProfessionalController.js';
import { requireRole } from '../middlewares/auth.js';

/** Rotas: Profissional. */
export function registerProfessionalRoutes(app: FastifyInstance, c: ProfessionalController, p: string) {
  app.get(
    `${p}/professional/documents/:id/download`,
    { preHandler: requireRole('PROFISSIONAL') },
    c.downloadProfessionalDocument.bind(c),
  );

  app.get(
    `${p}/professional/agenda`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.agenda.bind(c),
  );

  app.get(
    `${p}/professional/agenda/availability`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.availability.bind(c),
  );

  app.put(
    `${p}/professional/agenda/availability`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.saveAvailability.bind(c),
  );

  app.post(
    `${p}/professional/agenda/blocks`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.block.bind(c),
  );

  app.patch(
    `${p}/professional/settings/duration`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.duration.bind(c),
  );

  app.get(
    `${p}/professional/appointments/:id`,
    { preHandler: requireRole('PROFISSIONAL') },
    c.professionalAppointment.bind(c),
  );

  // US018: o profissional registra a falta do paciente (alimenta o relatório de faltas).
  app.patch(
    `${p}/professional/appointments/:id/no-show`,
    { preHandler: requireRole('PROFISSIONAL') },
    c.markNoShow.bind(c),
  );

  app.get(
    `${p}/professional/history`,
    { preHandler: requireRole('PROFISSIONAL') },
    c.professionalHistory.bind(c),
  );

  app.get(
    `${p}/professional/patients/:cpf/history`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.patientHistory.bind(c),
  );

  app.post(
    `${p}/professional/appointments/:id/attendance`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.registerAttendance.bind(c),
  );

  app.patch(
    `${p}/professional/attendances/:id/status`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.statusAttendance.bind(c),
  );

  app.get(
    `${p}/professional/appointments/:id/documents`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.listDocuments.bind(c),
  );

  app.post(
    `${p}/professional/appointments/:id/documents`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.uploadDocument.bind(c),
  );
}
