import type { FastifyInstance } from 'fastify';
import type { MasterController } from '../controllers/MasterController.js';
import { requireRole } from '../middlewares/auth.js';

/** Rotas: Administrador master. */
export function registerMasterRoutes(app: FastifyInstance, c: MasterController, p: string) {
  app.get(`${p}/master/logs`, { preHandler: requireRole('ADMIN_MASTER') }, c.masterAuditLogs.bind(c));

  app.get(
    `${p}/master/clinics`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterClinics.bind(c),
  );

  app.post(
    `${p}/master/clinics`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterCreateClinic.bind(c),
  );

  app.patch(
    `${p}/master/clinics/:id`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterUpdateClinic.bind(c),
  );

  app.get(
    `${p}/master/professionals`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterProfessionals.bind(c),
  );

  app.post(
    `${p}/master/professionals`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterCreateProfessional.bind(c),
  );

  app.patch(
    `${p}/master/professionals/:id`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterUpdateProfessional.bind(c),
  );

  app.get(
    `${p}/master/specialties`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterSpecialties.bind(c),
  );

  app.post(
    `${p}/master/specialties`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterCreateSpecialty.bind(c),
  );

  app.patch(
    `${p}/master/specialties/:id`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterUpdateSpecialty.bind(c),
  );

  app.get(
    `${p}/master/administrators`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterAdministrators.bind(c),
  );

  app.post(
    `${p}/master/administrators`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterCreateAdministrator.bind(c),
  );

  app.patch(
    `${p}/master/administrators/:id`,
    {
      preHandler: requireRole('ADMIN_MASTER'),
    },
    c.masterUpdateAdministrator.bind(c),
  );
}
