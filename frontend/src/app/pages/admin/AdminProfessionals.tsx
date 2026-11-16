import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Stethoscope } from 'lucide-react';
import { adminApi, ApiError, type Professional, type Specialty } from '../../lib/api';

export function AdminProfessionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([adminApi.professionals(), adminApi.specialties()]);
        setProfessionals(p.data);
        setSpecialties(s.data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os profissionais.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      professionals.filter((professional) => {
        const q = search.toLowerCase();
        if (!q) return true;
        const specialtyNames = professional.specialties
          .map((id) => specialties.find((s) => s.id === id)?.name ?? 'Especialidade não identificada')
          .join(' ');
        return `${professional.name} ${professional.email ?? ''} ${professional.crm ?? ''} ${specialtyNames}`
          .toLowerCase()
          .includes(q);
      }),
    [professionals, specialties, search],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profissionais de Saúde</h1>
        <p className="text-slate-500 mt-1">Catálogo oficial fornecido pelo backend.</p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label htmlFor="admin-professionals-search" className="block text-sm font-medium text-slate-700 mb-2">
          Pesquisar profissionais
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="admin-professionals-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CRM…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none"
          />
        </div>
      </div>
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex justify-center text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((professional) => (
            <div key={professional.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{professional.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">{professional.email ?? '—'}</p>
                </div>
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                  <Stethoscope size={18} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {professional.specialties.map((id) => (
                  <span key={id} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {specialties.find((s) => s.id === id)?.name ?? 'Especialidade não identificada'}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">CRM</p>
                  <p className="font-medium text-slate-700">{professional.crm ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Duração</p>
                  <p className="font-medium text-slate-700">{professional.consultationDurationMinutes} min</p>
                </div>
              </div>
              <div className="mt-4">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${professional.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {professional.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              Nenhum profissional encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
