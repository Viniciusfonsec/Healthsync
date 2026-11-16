import { ChevronRight, Search } from 'lucide-react';
import { BackButton } from '../../../components/BackButton';
import type { Specialty } from '../../../lib/api';

type Props = {
  clinicName?: string;
  specialties: Specialty[];
  search: string;
  onSearch: (value: string) => void;
  onSelect: (specialtyId: string) => void;
  onBack: () => void;
};

/** Etapa 2 do agendamento: escolha da especialidade, com busca por nome. */
export function SpecialtyStep({ clinicName, specialties, search, onSearch, onSelect, onBack }: Props) {
  const active = specialties.filter((item) => item.active);

  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} className="w-fit" />
      <div>
        <h2 className="text-lg font-bold text-slate-900">Qual especialidade você procura? *</h2>
        <p className="mt-1 text-sm text-slate-500">{clinicName}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <label className="sr-only" htmlFor="patient-schedule-specialty-search">
          Buscar especialidade
        </label>
        <input
          id="patient-schedule-specialty-search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar especialidade..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-primary hover:bg-brand-50"
          >
            <span className="font-medium text-slate-700">{item.name}</span>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        ))}
      </div>

      {active.length === 0 && (
        <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
          Nenhuma especialidade encontrada nesta unidade.
        </div>
      )}
    </div>
  );
}
