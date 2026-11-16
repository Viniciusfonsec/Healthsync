import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { adminApi, ApiError, type Specialty } from '../../lib/api';

export function AdminSpecialties() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '🩺', avgMinutes: '30' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setLoading(true);
      setSpecialties((await adminApi.specialties()).data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as especialidades.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => specialties.filter((specialty) => specialty.name.toLowerCase().includes(search.toLowerCase())),
    [specialties, search],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminApi.createSpecialty({
        name: form.name,
        description: form.description || undefined,
        icon: form.icon || undefined,
        avgMinutes: Number(form.avgMinutes),
      });
      setMessage('Especialidade criada com sucesso.');
      setForm({ name: '', description: '', icon: '🩺', avgMinutes: '30' });
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a especialidade.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Especialidades</h1>
          <p className="text-slate-500 mt-1">Gerencie o catálogo usado pelos agendamentos.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} /> Nova especialidade
        </button>
      </div>
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <label htmlFor="admin-specialty-search" className="sr-only">
            Pesquisar especialidades
          </label>
          <input
            id="admin-specialty-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar especialidade…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none"
          />
        </div>
      </div>
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex justify-center text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((specialty) => (
            <div key={specialty.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-xl">
                  {specialty.icon ?? '🩺'}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{specialty.name}</h2>
                  <p className="text-xs text-slate-400">{specialty.avgMinutes ?? '—'} min médios</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-4 min-h-10">
                {specialty.description ?? 'Sem descrição cadastrada.'}
              </p>
              <span
                className={`inline-flex mt-4 text-xs px-2.5 py-1 rounded-full font-medium ${specialty.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {specialty.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              Nenhuma especialidade encontrada.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-900">Nova especialidade</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400">
                <X size={18} />
              </button>
            </div>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Nome *</span>
              <input
                id="admin-specialty-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Descrição</span>
              <textarea
                id="admin-specialty-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Ícone</span>
                <input
                  id="admin-specialty-icon"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Duração média *</span>
                <input
                  id="admin-specialty-duration"
                  required
                  type="number"
                  min="5"
                  max="240"
                  value={form.avgMinutes}
                  onChange={(e) => setForm({ ...form, avgMinutes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando…' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
