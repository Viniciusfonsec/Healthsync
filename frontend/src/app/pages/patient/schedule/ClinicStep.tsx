import { Building2, ChevronRight } from 'lucide-react';
import { BackButton } from '../../../components/BackButton';
import type { Clinic } from '../../../lib/api';

type Props = {
  clinics: Clinic[];
  onSelect: (clinicId: string) => void;
};

/** Etapa 1 do agendamento: escolha da unidade. */
export function ClinicStep({ clinics, onSelect }: Props) {
  const active = clinics.filter((clinic) => clinic.active);

  return (
    <div className="space-y-4">
      <BackButton to="/patient/dashboard" className="w-fit" />
      <div>
        <h2 className="text-lg font-bold text-slate-900">Escolha uma unidade *</h2>
        <p className="mt-1 text-sm text-slate-500">Selecione em qual unidade deseja ser atendido.</p>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
          Nenhuma unidade disponível para agendamento.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((clinic) => (
            <button
              key={clinic.id}
              type="button"
              onClick={() => onSelect(clinic.id)}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-primary hover:bg-brand-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-primary">
                  <Building2 size={20} />
                </div>
                <div>
                  <span className="font-semibold text-slate-800">{clinic.name}</span>
                  {clinic.address?.city && (
                    <p className="mt-1 text-xs text-slate-400">{clinic.address.city}</p>
                  )}
                  {clinic.phone && <p className="mt-1 text-xs text-slate-400">{clinic.phone}</p>}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
