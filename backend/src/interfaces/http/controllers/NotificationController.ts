import { BaseController, parse } from './BaseController.js';
import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '../middlewares/auth.js';
import { idParam } from '../schemas/common.js';

/** Notificações do usuário logado. */
export class NotificationController extends BaseController {
  async patientNotifications(req: FastifyRequest) {
    return {
      data: await this.notifications.list(await this.patientId(req)),
    };
  }

  async notificationsForCurrentUser(req: FastifyRequest) {
    const actor = req.user as AuthUser;
    return { data: await this.notifications.listForUser(actor.userId) };
  }

  async readCurrentUserNotification(req: FastifyRequest) {
    const { id } = parse(idParam, req.params);
    const actor = req.user as AuthUser;
    return this.notifications.readForUser(id, actor.userId);
  }

  async readAllCurrentUserNotifications(req: FastifyRequest) {
    const actor = req.user as AuthUser;
    await this.notifications.readAllForUser(actor.userId);
    return { message: 'Notificações marcadas como lidas' };
  }

  async readNotification(req: FastifyRequest) {
    const { id } = parse(idParam, req.params);

    return this.notifications.read(id, await this.patientId(req));
  }

  async readAllNotifications(req: FastifyRequest) {
    await this.notifications.readAll(await this.patientId(req));

    return {
      message: 'Notificações marcadas como lidas',
    };
  }
}
