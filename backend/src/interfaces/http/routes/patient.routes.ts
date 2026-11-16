import type { FastifyInstance } from 'fastify';
import type { PatientController } from '../controllers/PatientController.js';
import { requireRole } from '../middlewares/auth.js';

/** Rotas: Paciente. */
export function registerPatientRoutes(app: FastifyInstance, c: PatientController, p: string) {
  app.get(
    `${p}/patient/appointments`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.listAppointments.bind(c),
  );

  app.post(
    `${p}/patient/appointments`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.createAppointment.bind(c),
  );

  app.patch(
    `${p}/patient/appointments/:id/reschedule`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.reschedule.bind(c),
  );

  app.post(
    `${p}/patient/appointments/:id/cancel`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.cancel.bind(c),
  );

  app.post(
    `${p}/patient/appointments/:id/calendar-email`,
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      preHandler: requireRole('PACIENTE'),
    },
    c.sendAppointmentCalendarEmail.bind(c),
  );

  app.post(
    `${p}/patient/appointments/:id/confirm`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.confirm.bind(c),
  );

  app.get(
    `${p}/patient/history`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.history.bind(c),
  );

  app.get(
    `${p}/patient/appointments/:id/documents`,
    { preHandler: requireRole('PACIENTE') },
    c.listPatientDocuments.bind(c),
  );

  app.get(
    `${p}/patient/documents/:id/download`,
    { preHandler: requireRole('PACIENTE') },
    c.downloadPatientDocument.bind(c),
  );

  app.get(
    `${p}/patient/profile`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.profile.bind(c),
  );

  app.patch(
    `${p}/patient/profile`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.updateProfile.bind(c),
  );

  /*
   * Lista clínicas disponíveis para o paciente.
   */
  app.get(
    `${p}/patient/catalog/clinics`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.patientClinics.bind(c),
  );

  /*
   * Lista especialidades da clínica selecionada.
   *
   * Exemplo:
   * GET /api/v1/patient/catalog/specialties?clinicId=...
   */
  app.get(
    `${p}/patient/catalog/specialties`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.patientCatalogSpecialties.bind(c),
  );

  /*
   * Lista profissionais da clínica selecionada.
   *
   * Exemplo:
   * GET /api/v1/patient/catalog/professionals?clinicId=...
   */
  app.get(
    `${p}/patient/catalog/professionals`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.patientCatalogProfessionals.bind(c),
  );
}
