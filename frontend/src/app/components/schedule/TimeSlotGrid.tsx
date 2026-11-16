import { formatTime } from '../../lib/format';

type Slot = { dateTime: string; durationMinutes: number };

type Props = {
  slots: Slot[];
  /** dateTime (ISO) do horário escolhido. */
  selected?: string;
  onSelect: (dateTime: string) => void;
  loading?: boolean;
  /** Ainda não há data escolhida. */
  waitingForDate?: boolean;
};

/** Horários livres do profissional na data escolhida. */
export function TimeSlotGrid({ slots, selected, onSelect, loading, waitingForDate }: Props) {
  const message = loading
    ? 'Buscando horários disponíveis...'
    : waitingForDate
      ? 'Selecione uma data para ver os horários.'
      : slots.length === 0
        ? 'Nenhum horário disponível nesta data. Escolha outro dia.'
        : '';

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">Horário disponível *</legend>
      {message ? (
        <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500" role="status">
          {message}
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
          role="radiogroup"
          aria-label="Horários disponíveis"
        >
          {slots.map((slot) => {
            const active = slot.dateTime === selected;
            return (
              <button
                key={slot.dateTime}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(slot.dateTime)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary'
                }`}
              >
                {formatTime(slot.dateTime)}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
