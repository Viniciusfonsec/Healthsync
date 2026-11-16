import { MapPin, Video } from 'lucide-react';

export type AppointmentType = 'PRESENCIAL' | 'TELEMEDICINA';

const OPTIONS: Array<{ value: AppointmentType; label: string; hint: string; Icon: typeof MapPin }> = [
  { value: 'PRESENCIAL', label: 'Presencial', hint: 'Atendimento no consultório da unidade.', Icon: MapPin },
  {
    value: 'TELEMEDICINA',
    label: 'On-line',
    hint: 'Teleconsulta por vídeo; o link chega após o agendamento.',
    Icon: Video,
  },
];

/** Escolha entre atendimento presencial e on-line (o local é definido pelo tipo). */
export function AppointmentTypePicker({
  value,
  onChange,
}: {
  value: AppointmentType;
  onChange: (value: AppointmentType) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-slate-700">Tipo de atendimento *</legend>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
        {OPTIONS.map(({ value: option, label, hint, Icon }) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`rounded-xl border p-3 text-left transition ${
                selected ? 'border-primary bg-brand-50' : 'border-slate-200 hover:border-primary'
              }`}
            >
              <Icon size={18} className="mb-1 text-primary" aria-hidden="true" />
              <span className="font-medium text-slate-800">{label}</span>
              <p className="mt-1 text-xs text-slate-500">{hint}</p>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
