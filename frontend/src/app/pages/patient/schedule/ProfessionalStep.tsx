import { ChevronRight, User } from 'lucide-react';
import { BackButton } from '../../../components/BackButton';
import type { Professional } from '../../../lib/api';
import { WEEKDAY_NAMES } from '../../../lib/format';

type Props = {
  clinicName?: string;
  specialtyName?: string;
  professionals: Professional[];
  onSelect: (professionalId: string) => void;
  onBack: () => void;
};

/** Etapa 3 do agendamento: escolha do profissional, com os dias e horários de atendimento. */
export function ProfessionalStep({ clinicName, specialtyName, professionals, onSelect, onBack }: Props) {
  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} className="w-fit" />
      <div>
        <h2 className="text-lg font-bold text-slate-900">Selecione o profissional *</h2>
        <p className="text-sm text-slate-500">
          {clinicName} · {specialtyName}
        </p>
      </div>

      {professionals.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
          Nenhum profissional está vinculado a esta especialidade.
        </div>
      ) : (
        <div className="space-y-3">
          {professionals.map((professional) => {
            const availability = (professional.availability ?? []).filter((slot) => slot.active !== false);
            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => onSelect(professional.id)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:border-primary hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{professional.name}</h3>
                    {professional.crm && <p className="mt-1 text-xs text-slate-400">{professional.crm}</p>}
                    {availability.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {availability.map((slot, index) => (
                          <p
                            key={`${slot.dayOfWeek}-${slot.startTime}-${index}`}
                            className="text-xs text-slate-500"
                          >
                            {WEEKDAY_NAMES[slot.dayOfWeek]} · {slot.startTime}–{slot.endTime}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">Agenda a confirmar pela unidade.</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
