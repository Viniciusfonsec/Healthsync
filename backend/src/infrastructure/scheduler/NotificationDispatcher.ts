import type { Repositories } from '../../domain/repositories/contracts.js';
import type { CommunicationChannel, Notification, NotificationType } from '../../domain/entities/types.js';
import type { NotificationGateway } from '../gateways/NotificationGateways.js';
import { nowIso } from '../../domain/entities/types.js';

/** Depois de tantas falhas seguidas, a notificação é marcada como ERRO e não é mais tentada. */
export const MAX_SEND_ATTEMPTS = 3;

const SUBJECT_BY_TYPE: Record<NotificationType, string> = {
  CONSULTA: 'Sua consulta',
  LEMBRETE: 'Lembrete de consulta',
  RESULTADO: 'Resultado disponível',
  SISTEMA: 'Aviso do sistema',
  MENSAGEM: 'Nova mensagem',
};

export type DispatchSummary = { sent: number; retrying: number; failed: number };

/**
 * Envia as notificações PENDENTES por WhatsApp/e-mail e registra o resultado:
 * ENVIADO (com sentAt), PENDENTE para nova tentativa, ou ERRO após MAX_SEND_ATTEMPTS
 * ou quando não há telefone/e-mail para o destinatário.
 */
export class NotificationDispatcher {
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private readonly gateways: Map<CommunicationChannel, NotificationGateway>;

  constructor(
    private readonly repositories: Repositories,
    gateways: NotificationGateway[],
    private readonly intervalMs: number,
  ) {
    this.gateways = new Map(gateways.map((gateway) => [gateway.channel, gateway]));
  }

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

  async run(limit = 50): Promise<DispatchSummary> {
    const summary: DispatchSummary = { sent: 0, retrying: 0, failed: 0 };
    // Evita duas execuções sobrepostas enviando a mesma notificação.
    if (this.running) return summary;
    this.running = true;
    try {
      for (const notification of await this.repositories.notifications.findPending(limit)) {
        const gateway = this.gateways.get(notification.channel);
        if (!gateway) continue;

        const attempts = notification.attempts + 1;
        const destination = await this.destination(notification);
        if (!destination) {
          await this.repositories.notifications.update(notification.id, { status: 'ERRO', attempts });
          summary.failed += 1;
          continue;
        }

        let success = false;
        try {
          const result = await gateway.send(
            destination,
            notification.content,
            notification.channel === 'EMAIL'
              ? { subject: `HealthSync - ${SUBJECT_BY_TYPE[notification.type]}` }
              : undefined,
          );
          success = result.success;
        } catch {
          success = false;
        }

        if (success) {
          await this.repositories.notifications.update(notification.id, {
            status: 'ENVIADO',
            sentAt: nowIso(),
            attempts,
          });
          summary.sent += 1;
        } else if (attempts >= MAX_SEND_ATTEMPTS) {
          await this.repositories.notifications.update(notification.id, { status: 'ERRO', attempts });
          summary.failed += 1;
        } else {
          await this.repositories.notifications.update(notification.id, { attempts });
          summary.retrying += 1;
        }
      }
    } finally {
      this.running = false;
    }
    return summary;
  }

  /** Telefone (WhatsApp) ou e-mail do destinatário: o paciente, ou então o usuário da conta. */
  private async destination(notification: Notification): Promise<string | undefined> {
    if (notification.patientId != null) {
      const patient = await this.repositories.patients.findById(notification.patientId);
      if (patient) return notification.channel === 'WHATSAPP' ? patient.phone : patient.email;
    }
    if (notification.userId != null && notification.channel === 'EMAIL') {
      return (await this.repositories.users.findById(notification.userId))?.email;
    }
    return undefined;
  }
}
