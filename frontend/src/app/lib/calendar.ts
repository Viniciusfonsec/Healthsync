type CalendarStatus = 'CONFIRMED' | 'CANCELLED';

export function downloadAppointmentCalendar(input: {
  title: string;
  description?: string;
  location?: string;
  start: string;
  durationMinutes: number;
  appointmentId?: number | string;
  sequence?: number;
  status?: CalendarStatus;
}) {
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Data da consulta inválida para gerar o convite da agenda.');
  }

  const end = new Date(start.getTime() + Math.max(1, input.durationMinutes) * 60_000);
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
  const uid =
    input.appointmentId != null
      ? `healthsync-appointment-${input.appointmentId}@healthsync`
      : `healthsync-${toUtc(start)}@healthsync`;
  const status = input.status ?? 'CONFIRMED';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HealthSync//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${Math.max(0, input.sequence ?? 0)}`,
    `DTSTAMP:${toUtc(new Date())}`,
    `DTSTART:${toUtc(start)}`,
    `DTEND:${toUtc(end)}`,
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(input.description ?? 'Compromisso agendado pelo HealthSync')}`,
    `LOCATION:${escapeText(input.location ?? '')}`,
    `STATUS:${status}`,
    'CLASS:PRIVATE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(input.title)}`,
    'TRIGGER:-PT60M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `healthsync-consulta-${input.appointmentId ?? 'agendamento'}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Link "Adicionar ao Google Agenda" (abre no app do Google Agenda no celular ou no navegador). */
export function googleCalendarUrl(input: {
  title: string;
  description?: string;
  location?: string;
  start: string;
  durationMinutes: number;
}) {
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Data da consulta inválida para gerar o convite da agenda.');
  }
  const end = new Date(start.getTime() + Math.max(1, input.durationMinutes) * 60_000);
  const fmt = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: input.description ?? 'Compromisso agendado pelo HealthSync',
    location: input.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
