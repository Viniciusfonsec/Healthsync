const TIME_ZONE = 'America/Sao_Paulo';

/**
 * Data e hora para mensagens ao paciente: "10/11/2026 às 14:30".
 * Sempre no fuso de São Paulo e apenas com hora e minuto (sem segundos).
 */
export function formatDateTimeBR(value: Date | string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} às ${get('hour')}:${get('minute')}`;
}
