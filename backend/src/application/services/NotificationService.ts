import type { Repositories } from '../../domain/repositories/contracts.js';
import { notFound } from '../../domain/errors/DomainError.js';
import { nowIso } from '../../domain/entities/types.js';

export class NotificationService {
  constructor(private readonly r: Repositories) {}
  async list(patientId: number) {
    return this.r.notifications.findByPatientId(patientId);
  }
  async listForUser(userId: number) {
    const [userNotifications, patient] = await Promise.all([
      this.r.notifications.findByUserId(userId),
      this.r.patients.findByUserId(userId),
    ]);
    const patientNotifications = patient ? await this.r.notifications.findByPatientId(patient.id) : [];
    const user = await this.r.users.findById(userId);
    const byId = new Map();
    for (const notification of [...patientNotifications, ...userNotifications]) {
      // Remove avisos clínicos antigos que foram distribuídos globalmente
      // antes da correção. O master conserva somente avisos administrativos.
      if (
        user?.role === 'ADMIN_MASTER' &&
        (notification.appointmentId != null ||
          notification.type === 'CONSULTA' ||
          notification.type === 'LEMBRETE' ||
          notification.type === 'RESULTADO')
      ) {
        continue;
      }
      byId.set(notification.id, notification);
    }
    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async readForUser(id: number, userId: number) {
    const notification = await this.r.notifications.findById(id);
    if (!notification) throw notFound('Notificação não encontrada');
    let ownsNotification = notification.userId === userId;
    if (!ownsNotification && notification.patientId != null) {
      const patient = await this.r.patients.findByUserId(userId);
      ownsNotification = Boolean(patient && patient.id === notification.patientId);
    }
    if (!ownsNotification) throw notFound('Notificação não encontrada');
    return this.r.notifications.update(id, { readAt: nowIso() });
  }
  async readAllForUser(userId: number) {
    for (const notification of await this.listForUser(userId)) {
      if (!notification.readAt) {
        await this.r.notifications.update(notification.id, { readAt: nowIso() });
      }
    }
  }
  async read(id: number, patientId: number) {
    const notification = await this.r.notifications.findById(id);
    if (!notification || notification.patientId !== patientId) {
      throw notFound('Notificação não encontrada');
    }
    return this.r.notifications.update(id, {
      readAt: nowIso(),
    });
  }
  async readAll(patientId: number) {
    for (const notification of await this.r.notifications.findByPatientId(patientId)) {
      if (!notification.readAt) {
        await this.r.notifications.update(notification.id, {
          readAt: nowIso(),
        });
      }
    }
  }
}
