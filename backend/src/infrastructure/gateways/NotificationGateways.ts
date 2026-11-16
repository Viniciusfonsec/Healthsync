import type { CommunicationChannel } from '../../domain/entities/types.js';
import { env } from '../../config/env.js';

export interface NotificationAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  /** Para convites de agenda, use 'REQUEST' ou 'PUBLISH' para o cliente de e-mail reconhecer o evento. */
  method?: string;
}

export interface NotificationOptions {
  subject?: string;
  html?: string;
  attachments?: NotificationAttachment[];
}

export interface NotificationGateway {
  send(
    to: string,
    content: string,
    options?: NotificationOptions,
  ): Promise<{ success: boolean; externalId?: string }>;
  channel: CommunicationChannel;
}

export class WhatsAppGateway implements NotificationGateway {
  channel = 'WHATSAPP' as const;
  async send(to: string, content: string) {
    console.info(`[WhatsApp SIMULADO] ${to}: ${content}`);
    return { success: true, externalId: `wa_${Date.now()}` };
  }
}

type Transporter = {
  sendMail(message: Record<string, unknown>): Promise<{ messageId?: string }>;
};

/**
 * Envio de e-mail.
 * - Com SMTP_HOST configurado, envia de verdade usando nodemailer
 *   (instale com `npm install nodemailer` dentro de backend).
 * - Sem SMTP_HOST, mantém o comportamento anterior: apenas registra no console.
 */
export class EmailGateway implements NotificationGateway {
  channel = 'EMAIL' as const;
  private transporter: Promise<Transporter | null> | undefined;

  private getTransporter(): Promise<Transporter | null> {
    if (!env.SMTP_HOST) return Promise.resolve(null);
    this.transporter ??= (async () => {
      try {
        const moduleName = 'nodemailer';
        const nodemailer = (await import(moduleName)) as {
          default?: { createTransport: (options: Record<string, unknown>) => Transporter };
          createTransport?: (options: Record<string, unknown>) => Transporter;
        };
        const createTransport = nodemailer.createTransport ?? nodemailer.default?.createTransport;
        if (!createTransport) throw new Error('createTransport indisponível');
        return createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
        });
      } catch (error) {
        console.error(
          '[Email] SMTP_HOST definido, mas o pacote "nodemailer" não pôde ser carregado. Execute `npm install nodemailer` em backend.',
          error,
        );
        return null;
      }
    })();
    return this.transporter;
  }

  async send(to: string, content: string, options: NotificationOptions = {}) {
    const transporter = await this.getTransporter();
    if (!transporter) {
      const extra = options.attachments?.length
        ? ` [anexos: ${options.attachments.map((item) => item.filename).join(', ')}]`
        : '';
      console.info(
        `[Email SIMULADO] ${to}: ${options.subject ? `${options.subject} — ` : ''}${content}${extra}`,
      );
      return { success: true, externalId: `mail_${Date.now()}` };
    }

    try {
      const info = await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: options.subject ?? 'HealthSync',
        text: content,
        html: options.html,
        attachments: options.attachments?.map((item) => ({
          filename: item.filename,
          content: item.content,
          contentType: item.contentType,
        })),
        icalEvent: options.attachments?.find((item) => item.contentType.startsWith('text/calendar'))
          ? {
              method:
                options.attachments.find((item) => item.contentType.startsWith('text/calendar'))?.method ??
                'PUBLISH',
              content: String(
                options.attachments.find((item) => item.contentType.startsWith('text/calendar'))?.content ??
                  '',
              ),
            }
          : undefined,
      });
      return { success: true, externalId: info.messageId };
    } catch (error) {
      console.error(`[Email] falha ao enviar para ${to}`, error);
      return { success: false };
    }
  }
}
