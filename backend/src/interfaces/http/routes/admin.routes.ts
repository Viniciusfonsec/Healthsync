import type { FastifyInstance } from 'fastify';
import type { AdminController } from '../controllers/AdminController.js';
import { requireRole } from '../middlewares/auth.js';

/** Rotas: Administrador da unidade. */
export function registerAdminRoutes(app: FastifyInstance, c: AdminController, p: string) {
  app.get(
    `${p}/admin/dashboard`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.adminDashboard.bind(c),
  );

  app.get(
    `${p}/admin/users`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.adminUsers.bind(c),
  );

  app.post(
    `${p}/admin/users/patients`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.adminCreatePatient.bind(c),
  );

  app.get(
    `${p}/admin/specialties`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.specialties.bind(c),
  );

  app.post(
    `${p}/admin/specialties`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.createSpecialty.bind(c),
  );

  app.get(
    `${p}/admin/professionals`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.professionals.bind(c),
  );

  app.get(
    `${p}/admin/reports/absences`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.absences.bind(c),
  );

  app.get(
    `${p}/admin/reports/productivity`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.productivity.bind(c),
  );

  app.get(
    `${p}/admin/logs`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.auditLogs.bind(c),
  );

  app.get(
    `${p}/admin/settings`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.settings.bind(c),
  );

  app.patch(
    `${p}/admin/settings`,
    {
      preHandler: requireRole('ADMINISTRADOR'),
    },
    c.updateSettings.bind(c),
  );
}
