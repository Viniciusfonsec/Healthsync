import { effectivePriorities, type PatientPriority } from './priorities';

const SMALL_WORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

function titleCase(word: string) {
  const lower = word.toLocaleLowerCase('pt-BR');
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

/**
 * Primeiro nome para saudações ("Olá, João!").
 * Usa o nome da conta; se não houver, tenta o início do e-mail separando por . _ - e números.
 */
/** Nomes dos dias da semana (0 = domingo), no formato usado na agenda dos profissionais. */
export const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

/** Só a primeira letra maiúscula ("novembro de 2026" → "Novembro de 2026"). */
export function capitalizeFirst(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1) : text;
}

/** Título de mês para calendários: "Novembro de 2026". */
export function monthTitle(date: Date): string {
  return capitalizeFirst(new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date));
}

/** Hora e minuto (ex.: 14:30) no fuso do navegador. */
export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function firstNameOf(name?: string | null, email?: string | null, fallback = 'Paciente'): string {
  const fromName = name
    ?.trim()
    .split(/\s+/)
    .find((part) => part && !SMALL_WORDS.has(part.toLowerCase()));
  if (fromName) return titleCase(fromName);
  const local = email?.split('@')[0] ?? '';
  const fromEmail = local.split(/[._\-+\d]+/).find(Boolean);
  return fromEmail ? titleCase(fromEmail) : fallback;
}

/** "terça-feira, 10/11" — dia da semana em português. */
export function formatWeekdayDate(date: Date = new Date()): string {
  const text = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}

const STATUS_LABELS: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
  FALTA: 'Falta',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const ISO_DATETIME = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g;

/**
 * Limpa horários de mensagens antigas: datas ISO ("2026-11-20T13:00:00.000Z") viram
 * "20/11/2026 às 10:00" e "HH:mm:ss" perde os segundos.
 */
export function stripSeconds(text: string): string {
  return text
    .replace(ISO_DATETIME, (match) => formatDateTimeShort(match) || match)
    .replace(/\b(\d{1,2}:\d{2}):\d{2}\b/g, '$1');
}

/** "10/11/2026 às 14:30" — somente hora e minuto. */
export function formatDateTimeShort(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    date,
  );
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${day} às ${time}`;
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export type PriorityFilter = 'TODOS' | 'PRIORITARIOS' | PatientPriority;

export interface PatientDayItem {
  patient?: { name?: string; birthDate?: string; priorities?: PatientPriority[] } | null;
}

/** Filtra pacientes do dia por nome (sem diferenciar acentos/maiúsculas) e por preferência. */
export function filterPatientsOfTheDay<T extends PatientDayItem>(
  items: T[],
  query: string,
  priority: PriorityFilter = 'TODOS',
  today: Date = new Date(),
): T[] {
  const needle = normalize(query);
  return items.filter((item) => {
    if (needle && !normalize(item.patient?.name ?? '').includes(needle)) return false;
    if (priority === 'TODOS') return true;
    const active = effectivePriorities(item.patient ?? undefined, today);
    return priority === 'PRIORITARIOS' ? active.length > 0 : active.includes(priority);
  });
}
