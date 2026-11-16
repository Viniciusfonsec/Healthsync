import type { Repositories } from '../../domain/repositories/contracts.js';
import type { NotificationGateway } from '../gateways/NotificationGateways.js';
import { nowIso } from '../../domain/entities/types.js';
import { formatDateTimeBR } from '../../application/services/dateFormat.js';

export class ReminderJob {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly repositories: Repositories,
    private readonly whatsapp: NotificationGateway,
    private readonly email: NotificationGateway,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      void this.run();
    }, this.intervalMs);

    void this.run();
  }

  stop(): void {
    if (!this.timer) return;

    clearInterval(this.timer);
    this.timer = undefined;
  }

  async run(): Promise<void> {
    const from = new Date();
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    const appointments = await this.repositories.appointments.findByDateTimeRange(from, to);

    for (const appointment of appointments.filter(
      (item) => item.status === 'AGENDADA' || item.status === 'CONFIRMADA',
    )) {
      const patient = await this.repositories.patients.findById(appointment.patientId);
      if (!patient) continue;

      const patientNotifications = await this.repositories.notifications.findByPatientId(patient.id);
      const reminderAlreadyCreated = patientNotifications.some(
        (item) => item.appointmentId === appointment.id && item.type === 'LEMBRETE',
      );

      if (reminderAlreadyCreated) continue;

      const content = `Lembrete: sua consulta está agendada para ${formatDateTimeBR(appointment.dateTime)}.`;

      for (const gateway of [this.whatsapp, this.email]) {
        await this.repositories.notifications.create({
          patientId: patient.id,
          appointmentId: appointment.id,
          type: 'LEMBRETE',
          channel: gateway.channel,
          content,
          status: 'PENDENTE',
          attempts: 0,
          createdAt: nowIso(),
        });
      }
    }
  }
}
