import type { FastifyInstance } from 'fastify';
import type { PublicController } from '../controllers/PublicController.js';

/** Rotas: Agendamento público (sem login). */
export function registerPublicRoutes(app: FastifyInstance, c: PublicController, p: string) {
  app.get(`${p}/public/clinics`, c.publicClinics.bind(c));

  app.get(`${p}/public/catalog/specialties`, c.publicCatalogSpecialties.bind(c));

  app.get(`${p}/public/catalog/professionals`, c.publicCatalogProfessionals.bind(c));

  app.get(`${p}/public/availability`, c.publicAvailability.bind(c));

  app.post(`${p}/public/appointments`, c.createPublicAppointment.bind(c));
}
