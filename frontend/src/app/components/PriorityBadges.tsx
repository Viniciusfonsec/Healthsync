import { Accessibility, Baby, UserRound } from 'lucide-react';
import { effectivePriorities, PRIORITY_LABELS, type PatientPriority } from '../lib/priorities';

const STYLE: Record<PatientPriority, { className: string; Icon: typeof Baby }> = {
  IDOSO: { className: 'bg-amber-50 text-amber-800 border-amber-200', Icon: UserRound },
  GESTANTE: { className: 'bg-pink-50 text-pink-800 border-pink-200', Icon: Baby },
  PESSOA_COM_DEFICIENCIA: { className: 'bg-brand-50 text-brand-800 border-brand-200', Icon: Accessibility },
};

/** Selos de preferência de atendimento (idoso, gestante, pessoa com deficiência). */
export function PriorityBadges({
  patient,
  className = '',
}: {
  patient?: { priorities?: PatientPriority[] | null; birthDate?: string | null } | null;
  className?: string;
}) {
  const items = effectivePriorities(patient ?? undefined);
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Preferência de atendimento">
      {items.map((item) => {
        const { className: tone, Icon } = STYLE[item];
        return (
          <span
            key={item}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
          >
            <Icon size={12} aria-hidden="true" /> {PRIORITY_LABELS[item]}
          </span>
        );
      })}
    </div>
  );
}
