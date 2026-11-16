import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Loader2, Plus, Power, Search, ShieldCheck, X } from 'lucide-react';

import {
  masterAdministratorsApi,
  masterApi,
  type MasterAdministrator,
  type MasterClinic,
} from '../../lib/api';
import type { FormEvent } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';

const emptyForm = {
  clinicId: '',
  name: '',
  email: '',
  password: '',
};

export function MasterAdministrators() {
  const [confirm, confirmDialog] = useConfirm();
  const [items, setItems] = useState<MasterAdministrator[]>([]);
  const [clinics, setClinics] = useState<MasterClinic[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MasterAdministrator | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      setLoading(true);
      setError('');

      const [administrators, clinics] = await Promise.all([
        masterAdministratorsApi.list(),
        masterApi.clinics(),
      ]);

      setItems(administrators.data);
      setClinics(clinics.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os administradores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const clinicMap = useMemo(() => new Map(clinics.map((clinic) => [clinic.id, clinic.name])), [clinics]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) =>
      `${item.name} ${item.email} ${clinicMap.get(item.clinicId) ?? ''}`.toLowerCase().includes(q),
    );
  }, [items, search, clinicMap]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      clinicId: clinics.find((clinic) => clinic.active)?.id ?? '',
      password: 'ChangeMe123!',
    });
    setError('');
    setOpen(true);
  }

  function openEdit(item: MasterAdministrator) {
    setEditing(item);
    setForm({
      clinicId: item.clinicId,
      name: item.name,
      email: item.email,
      password: '',
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
        await masterAdministratorsApi.update(editing.id, {
          clinicId: form.clinicId,
          name: form.name.trim(),
          email: form.email.trim(),
        });
      } else {
        await masterAdministratorsApi.create({
          clinicId: form.clinicId,
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim() || 'ChangeMe123!',
        });
      }

      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o administrador.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: MasterAdministrator) {
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
      await masterAdministratorsApi.update(item.id, {
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
            <ShieldCheck size={21} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administradores</h1>
            <p className="mt-1 text-sm text-slate-500">Administração dos responsáveis por cada unidade.</p>
          </div>
        </div>

        <button type="button" onClick={openCreate} className="btn btn-primary">
          <Plus size={18} />
          Novo administrador
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
          <input
            aria-label="Pesquisar administradores"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou unidade..."
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

                  <p className="mt-1 text-sm text-slate-500">{item.email}</p>

                  <p className="mt-1 text-xs text-slate-400">
                    {clinicMap.get(item.clinicId) ?? 'Unidade não identificada'}
                  </p>
                </div>

                <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
                  <ShieldCheck size={18} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.active ? 'Ativo' : 'Inativo'}
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
                {editing ? 'Editar administrador' : 'Novo administrador'}
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
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Unidade *</span>
                <select
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
              </label>

              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Nome *</span>
                <input
                  required
                  id="master-admin-name"
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
              </label>

              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">E-mail *</span>
                <input
                  required
                  id="master-admin-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  placeholder="E-mail"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>

              {!editing && (
                <label className="space-y-1 block">
                  <span className="text-sm font-medium text-slate-700">Senha inicial *</span>
                  <input
                    required
                    id="master-admin-password"
                    minLength={8}
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        password: event.target.value,
                      })
                    }
                    placeholder="Senha inicial"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  />
                </label>
              )}

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
