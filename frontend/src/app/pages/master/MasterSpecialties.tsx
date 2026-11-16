import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Loader2, Plus, Power, Search, Stethoscope, X } from 'lucide-react';

import { masterApi, masterSpecialtiesApi, type MasterClinic, type Specialty } from '../../lib/api';
import type { FormEvent } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';

const emptyForm = {
  clinicId: '',
  name: '',
  description: '',
  icon: '',
  avgMinutes: 30,
};

export function MasterSpecialties() {
  const [confirm, confirmDialog] = useConfirm();
  const [items, setItems] = useState<Specialty[]>([]);
  const [clinics, setClinics] = useState<MasterClinic[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      setLoading(true);
      setError('');

      const [specialties, clinics] = await Promise.all([masterSpecialtiesApi.list(), masterApi.clinics()]);

      setItems(specialties.data);
      setClinics(clinics.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as especialidades.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const clinicMap = useMemo(() => new Map(clinics.map((clinic) => [clinic.id, clinic.name])), [clinics]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return items;

    return items.filter((item) =>
      `${item.name} ${item.description ?? ''} ${clinicMap.get(item.clinicId) ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search, clinicMap]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      clinicId: clinics.find((clinic) => clinic.active)?.id ?? '',
    });
    setError('');
    setOpen(true);
  }

  function openEdit(item: Specialty) {
    setEditing(item);
    setForm({
      clinicId: item.clinicId,
      name: item.name,
      description: item.description ?? '',
      icon: item.icon ?? '',
      avgMinutes: item.avgMinutes,
    });
    setError('');
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      if (editing) {
        await masterSpecialtiesApi.update(editing.id, {
          clinicId: form.clinicId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          avgMinutes: form.avgMinutes,
        });
      } else {
        await masterSpecialtiesApi.create({
          clinicId: form.clinicId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          avgMinutes: form.avgMinutes,
        });
      }

      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a especialidade.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: Specialty) {
    if (
      !(await confirm({
        message: `Deseja ${item.active ? 'desativar' : 'ativar'} "${item.name}"?`,
        confirmLabel: item.active ? 'Desativar' : 'Ativar',
        danger: item.active,
      }))
    ) {
      return;
    }

    try {
      setError('');
      await masterSpecialtiesApi.update(item.id, {
        active: !item.active,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o status.');
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Stethoscope size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Especialidades</h1>
            <p className="mt-1 text-sm text-slate-500">Gestão global das especialidades por unidade.</p>
          </div>
        </div>

        <button type="button" onClick={openCreate} className="btn btn-primary">
          <Plus size={18} />
          Nova especialidade
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <label htmlFor="master-specialties-search" className="sr-only">
            Pesquisar especialidades
          </label>
          <input
            id="master-specialties-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar especialidade ou unidade..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} />
          Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{item.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {clinicMap.get(item.clinicId) ?? 'Unidade não identificada'}
                  </p>
                </div>
                <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
                  <Stethoscope size={18} />
                </div>
              </div>

              {item.description && <p className="mt-3 text-sm text-slate-500">{item.description}</p>}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.avgMinutes} min</span>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => openEdit(item)} className="btn btn-secondary btn-sm">
                  <Edit3 size={15} />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => void toggle(item)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    item.active
                      ? 'border border-red-200 text-red-700'
                      : 'border border-emerald-200 text-emerald-700'
                  }`}
                >
                  {item.active ? <Power size={15} /> : <CheckCircle2 size={15} />}
                  {item.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? 'Editar especialidade' : 'Nova especialidade'}
              </h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-5 p-6">
              <label htmlFor="master-specialty-clinic" className="text-sm font-medium text-slate-700">
                Unidade *
              </label>
              <select
                id="master-specialty-clinic"
                required
                value={form.clinicId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    clinicId: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <option value="">Escolha uma unidade</option>
                {clinics
                  .filter((clinic) => clinic.active)
                  .map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
              </select>

              <label htmlFor="master-specialty-name" className="text-sm font-medium text-slate-700">
                Nome *
              </label>
              <input
                id="master-specialty-name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                placeholder="Nome"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />

              <label htmlFor="master-specialty-description" className="text-sm font-medium text-slate-700">
                Descrição
              </label>
              <textarea
                id="master-specialty-description"
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                placeholder="Descrição"
                className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />

              <label htmlFor="master-specialty-duration" className="text-sm font-medium text-slate-700">
                Duração média (minutos) *
              </label>
              <input
                id="master-specialty-duration"
                type="number"
                min={5}
                max={240}
                required
                value={form.avgMinutes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    avgMinutes: Number(event.target.value),
                  })
                }
                placeholder="Duração média"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>

                <button type="submit" disabled={saving} className="btn btn-primary">
                  {editing ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
