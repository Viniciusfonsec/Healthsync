import type { FastifyInstance } from 'fastify';
import type { NotificationController } from '../controllers/NotificationController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/** Rotas: Notificações. */
export function registerNotificationRoutes(app: FastifyInstance, c: NotificationController, p: string) {
  app.get(`${p}/notifications`, { preHandler: requireAuth }, c.notificationsForCurrentUser.bind(c));

  app.patch(
    `${p}/notifications/:id/read`,
    { preHandler: requireAuth },
    c.readCurrentUserNotification.bind(c),
  );

  app.post(
    `${p}/notifications/read-all`,
    { preHandler: requireAuth },
    c.readAllCurrentUserNotifications.bind(c),
  );

  app.get(
    `${p}/patient/notifications`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.patientNotifications.bind(c),
  );

  app.patch(
    `${p}/patient/notifications/:id/read`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.readNotification.bind(c),
  );

  app.post(
    `${p}/patient/notifications/read-all`,
    {
      preHandler: requireRole('PACIENTE'),
    },
    c.readAllNotifications.bind(c),
  );
}
