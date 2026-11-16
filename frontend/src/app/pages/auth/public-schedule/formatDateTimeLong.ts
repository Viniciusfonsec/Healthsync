/** Ex.: "segunda-feira, 16 de novembro de 2026 às 10:00". */
export function formatDateTimeLong(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}
