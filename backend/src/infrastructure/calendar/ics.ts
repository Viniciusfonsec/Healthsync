export interface IcsEventInput {
  appointmentId: number | string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  durationMinutes: number;
  status?: 'CONFIRMED' | 'CANCELLED';
  sequence?: number;
  /** Lembrete antes da consulta, em minutos. Padrão: 60. Use 0 para desativar. */
  reminderMinutes?: number;
}

const toUtc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

/** Dobra linhas com mais de 75 octetos, conforme RFC 5545. */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    if (currentBytes + size > limit) {
      parts.push(current);
      current = ' ';
      currentBytes = 1;
      limit = 75;
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

/**
 * Gera um arquivo iCalendar (.ics) compatível com agenda do iPhone, Android,
 * Google Agenda e Outlook. O UID é estável por consulta, então reenviar o
 * convite atualiza o evento em vez de duplicá-lo.
 */
export function buildAppointmentIcs(input: IcsEventInput): string {
  const end = new Date(input.start.getTime() + Math.max(1, input.durationMinutes) * 60_000);
  const reminder = input.reminderMinutes ?? 60;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HealthSync//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:healthsync-appointment-${input.appointmentId}@healthsync`,
    `SEQUENCE:${Math.max(0, input.sequence ?? 0)}`,
    `DTSTAMP:${toUtc(new Date())}`,
    `DTSTART:${toUtc(input.start)}`,
    `DTEND:${toUtc(end)}`,
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(input.description ?? 'Compromisso agendado pelo HealthSync')}`,
    `LOCATION:${escapeText(input.location ?? '')}`,
    `STATUS:${input.status ?? 'CONFIRMED'}`,
    'CLASS:PRIVATE',
  ];
  if (reminder > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(input.title)}`,
      `TRIGGER:-PT${Math.floor(reminder)}M`,
      'END:VALARM',
    );
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
