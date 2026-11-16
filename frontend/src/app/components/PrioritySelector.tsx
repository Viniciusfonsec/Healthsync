import { PRIORITY_OPTIONS, togglePriority, type PatientPriority } from '../lib/priorities';

/** Escolha da preferência de atendimento (pode marcar mais de uma). */
export function PrioritySelector({
  value,
  onChange,
  idPrefix = 'priority',
  disabled,
}: {
  value: PatientPriority[];
  onChange: (next: PatientPriority[]) => void;
  idPrefix?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-700">Preferência de atendimento</legend>
      <p className="text-xs text-slate-500">
        Opcional. Ajuda a unidade a organizar o atendimento prioritário.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {PRIORITY_OPTIONS.map((option) => {
          const checked = value.includes(option.value);
          return (
            <label
              key={option.value}
              htmlFor={`${idPrefix}-${option.value}`}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${checked ? 'border-primary bg-brand-50' : 'border-slate-200 bg-white'}`}
            >
              <input
                id={`${idPrefix}-${option.value}`}
                type="checkbox"
                checked={checked}
                onChange={() => onChange(togglePriority(value, option.value))}
                className="mt-0.5 h-4 w-4 accent-brand-800"
              />
              <span>
                <span className="block font-medium text-slate-800">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
