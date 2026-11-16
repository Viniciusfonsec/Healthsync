import type { Repositories } from '../../domain/repositories/contracts.js';
import type { Appointment } from '../../domain/entities/types.js';
import type { NotificationGateway } from '../../infrastructure/gateways/NotificationGateways.js';
import { buildAppointmentIcs } from '../../infrastructure/calendar/ics.js';
import { DomainError } from '../../domain/errors/DomainError.js';

const TIME_ZONE = 'America/Sao_Paulo';

function formatDateTime(date: Date) {
  return date.toLocaleString('pt-BR', { timeZone: TIME_ZONE, dateStyle: 'full', timeStyle: 'short' });
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string,
  );
}

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

/**
 * Envia ao paciente, por e-mail, o resumo da consulta com o convite (.ics)
 * anexado, para ser salvo na agenda do celular ou do computador.
 */
export class AppointmentInviteService {
  constructor(
    private readonly repos: Repositories,
    private readonly email: NotificationGateway,
  ) {}

  async sendInvite(appointment: Appointment): Promise<{ sent: boolean; email: string }> {
    const patient = await this.repos.patients.findById(appointment.patientId);
    if (!patient?.email) {
      throw new DomainError('VALIDATION_ERROR', 'O paciente não possui e-mail cadastrado.', 400);
    }

    const [professional, specialty, clinic] = await Promise.all([
      this.repos.professionals.findById(appointment.professionalId),
      this.repos.specialties.findById(appointment.specialtyId),
      this.repos.clinics.findById(appointment.clinicId),
    ]);

    const start = new Date(appointment.dateTime);
    if (Number.isNaN(start.getTime())) {
      throw new DomainError('VALIDATION_ERROR', 'Data da consulta inválida.', 400);
    }

    const professionalName = professional?.name ?? 'HealthSync';
    const specialtyName = specialty?.name ?? 'Atendimento';
    const isTele = appointment.type === 'TELEMEDICINA';
    const place = isTele
      ? appointment.teleconsultationUrl || 'Atendimento on-line'
      : [clinic?.name, appointment.location].filter(Boolean).join(' — ') || 'Consultório';
    const cancelled = appointment.status === 'CANCELADA';

    const ics = buildAppointmentIcs({
      appointmentId: appointment.id,
      title: `Consulta - ${professionalName}`,
      description: `${specialtyName}${isTele && appointment.teleconsultationUrl ? `\nLink: ${appointment.teleconsultationUrl}` : ''}`,
      location: place,
      start,
      durationMinutes: appointment.durationMinutes,
      status: cancelled ? 'CANCELLED' : 'CONFIRMED',
      sequence: cancelled ? 1 : 0,
    });

    const when = formatDateTime(start);
    const subject = `${cancelled ? 'Consulta cancelada' : 'Sua consulta'} — ${when}`;
    const text = [
      `Olá, ${patient.name}.`,
      '',
      cancelled ? 'Sua consulta foi cancelada.' : 'Segue o resumo da sua consulta:',
      `Profissional: ${professionalName}`,
      `Especialidade: ${specialtyName}`,
      `Data e horário: ${when}`,
      `Local: ${place}`,
      '',
      'Abra o arquivo anexo (consulta-healthsync.ics) para salvar na agenda do seu celular ou computador.',
    ].join('\n');
    const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5"><p>Olá, ${escapeHtml(patient.name)}.</p><p>${cancelled ? 'Sua consulta foi cancelada.' : 'Segue o resumo da sua consulta:'}</p><ul><li><strong>Profissional:</strong> ${escapeHtml(professionalName)}</li><li><strong>Especialidade:</strong> ${escapeHtml(specialtyName)}</li><li><strong>Data e horário:</strong> ${escapeHtml(when)}</li><li><strong>Local:</strong> ${escapeHtml(place)}</li></ul><p>Abra o arquivo anexo para salvar na agenda do seu celular ou computador.</p></div>`;

    const result = await this.email.send(patient.email, text, {
      subject,
      html,
      attachments: [
        {
          filename: 'consulta-healthsync.ics',
          content: ics,
          contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
          method: 'PUBLISH',
        },
      ],
    });

    if (!result.success) {
      throw new DomainError(
        'EMAIL_FAILED',
        'Não foi possível enviar o e-mail agora. Tente novamente em instantes.',
        502,
      );
    }
    return { sent: true, email: maskEmail(patient.email) };
  }

  /** Envio automático após agendar: nunca derruba o agendamento se o e-mail falhar. */
  async sendInviteSafely(appointment: Appointment): Promise<void> {
    try {
      await this.sendInvite(appointment);
    } catch (error) {
      console.error('[AppointmentInvite] falha ao enviar convite automático', error);
    }
  }
}
