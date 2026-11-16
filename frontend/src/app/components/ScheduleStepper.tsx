import { Check } from 'lucide-react';

type Props = {
  /** Nome de cada etapa, na ordem. */
  steps: string[];
  /** Etapa atual, começando em 1. */
  current: number;
};

/**
 * Passo a passo do agendamento (com e sem login): círculos numerados ligados por
 * uma linha que vai ficando na cor da marca conforme o paciente avança.
 */
export function ScheduleStepper({ steps, current }: Props) {
  const column = 100 / steps.length;
  const progress = steps.length > 1 ? (current - 1) / (steps.length - 1) : 0;

  return (
    <nav aria-label="Etapas do agendamento" className="relative mb-8 px-2">
      <div
        className="absolute top-5 h-1 rounded-full bg-slate-200"
        style={{ left: `${column / 2}%`, right: `${column / 2}%` }}
      />
      <div
        className="absolute top-5 h-1 rounded-full bg-primary transition-all"
        style={{ left: `${column / 2}%`, width: `${progress * (100 - column)}%` }}
      />
      <ol
        className="relative grid gap-1"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((label, index) => {
          const number = index + 1;
          const active = current >= number;
          return (
            <li
              key={label}
              className="flex min-w-0 flex-col items-center text-center"
              aria-current={current === number ? 'step' : undefined}
            >
              <span
                className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                  active ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {current > number ? <Check size={16} aria-label="concluída" /> : number}
              </span>
              <span
                className={`mt-2 max-w-full text-xs leading-tight ${
                  active ? 'font-semibold text-primary' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
