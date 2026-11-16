import { conflict } from '../../domain/errors/DomainError.js';
import type { AppointmentStatus } from '../../domain/entities/types.js';

/**
 * Regras de agenda compartilhadas pelos serviços (antes cada serviço tinha uma cópia).
 */

/** Status em que a consulta ainda pode ser remarcada. */
export const allowedReschedule: readonly AppointmentStatus[] = ['AGENDADA', 'CONFIRMADA'];

/** Status que ocupam horário na agenda do profissional. */
export const activeAppointmentStatuses: readonly AppointmentStatus[] = ['AGENDADA', 'CONFIRMADA'];

const WEEKDAY_BY_INTL: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Indica se [start, end) cruza com a consulta que começa em otherStart. */
export function overlaps(start: Date, end: Date, otherStart: Date, otherDurationMinutes: number): boolean {
  const otherEnd = new Date(otherStart.getTime() + otherDurationMinutes * 60_000);
  return start < otherEnd && otherStart < end;
}

/** Converte "HH:mm" em minutos desde a meia-noite. */
export function timeToMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw conflict('Horário de disponibilidade inválido');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const values = [get('year'), get('month'), get('day'), get('hour'), get('minute'), get('second')] as const;
  if (!values.every(Number.isFinite)) {
    throw conflict('Não foi possível interpretar o fuso horário configurado');
  }
  const [year, month, day, hour, minute, second] = values;
  return Date.UTC(year, month - 1, day, hour, minute, second) - date.getTime();
}

/** Monta o instante UTC de uma data (YYYY-MM-DD) e hora (HH:mm) locais de um fuso. */
export function dateAtTimeZone(dateOnly: string, time: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) throw conflict('Data inválida');
  const minutes = timeToMinutes(time);
  const wallTime = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  );
  const offset = timeZoneOffsetMilliseconds(new Date(wallTime), timeZone);
  return new Date(wallTime - offset);
}

/** Dia da semana (0 = domingo) e minutos do dia de um instante, no fuso informado. */
export function zonedDayAndMinutes(
  date: Date,
  timeZone: string,
): { dayOfWeek: number; minutesOfDay: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  if (!weekday || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw conflict('Não foi possível interpretar a data/hora');
  }
  const dayOfWeek = WEEKDAY_BY_INTL[weekday];
  if (dayOfWeek === undefined) {
    throw conflict('Não foi possível identificar o dia da semana');
  }
  return { dayOfWeek, minutesOfDay: hour * 60 + minute };
}

/** Garante que as duas datas são válidas e que start vem antes de end. */
export function ensureValidRange(start: Date, end: Date, invalidMessage = 'Período inválido'): void {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw conflict(invalidMessage);
  }
}
