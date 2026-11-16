import { useErrorToast } from '../../lib/notify';
import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Edit3, Loader2, Plus, Power, X } from 'lucide-react';

import { masterApi, type MasterClinic, type MasterClinicPayload } from '../../lib/api';
import { useConfirm } from '../../components/ConfirmDialog';

const emptyForm: MasterClinicPayload = {
  name: '',
  document: '',
  phone: '',
  email: '',
  address: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
  },
};

export function MasterClinics() {
  const [confirm, confirmDialog] = useConfirm();
  const [clinics, setClinics] = useState<MasterClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterClinic | null>(null);
  const [form, setForm] = useState<MasterClinicPayload>(emptyForm);

  async function loadClinics() {
    try {
      setError('');
      setLoading(true);
      const response = await masterApi.clinics();
      setClinics(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as unidades.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClinics();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(clinic: MasterClinic) {
    setEditing(clinic);
    setForm({
      name: clinic.name,
      document: clinic.document ?? '',
      phone: clinic.phone ?? '',
      email: clinic.email ?? '',
      address: clinic.address
        ? {
            cep: clinic.address.cep ?? '',
            street: clinic.address.street ?? '',
            number: clinic.address.number ?? '',
            complement: clinic.address.complement ?? '',
            district: clinic.address.district ?? '',
            city: clinic.address.city ?? '',
            state: clinic.address.state ?? '',
          }
        : {
            ...emptyForm.address!,
          },
    });
    setError('');
    setModalOpen(true);
  }

  async function saveClinic(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const payload: MasterClinicPayload = {
        name: form.name.trim(),
        document: form.document?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address:
          form.address && Object.values(form.address).some((value) => String(value ?? '').trim() !== '')
            ? {
                cep: form.address.cep.trim(),
                street: form.address.street.trim(),
                number: form.address.number.trim(),
                complement: form.address.complement?.trim() || undefined,
                district: form.address.district.trim(),
                city: form.address.city.trim(),
                state: form.address.state.trim(),
              }
            : undefined,
      };

      if (editing) {
        await masterApi.updateClinic(editing.id, payload);
      } else {
        await masterApi.createClinic(payload);
      }

      setModalOpen(false);
      await loadClinics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a unidade.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleClinic(clinic: MasterClinic) {
    const action = clinic.active ? 'desativar' : 'ativar';

    if (
      !(await confirm({
        message: `Deseja realmente ${action} a unidade "${clinic.name}"?`,
        confirmLabel: clinic.active ? 'Desativar' : 'Ativar',
        danger: clinic.active,
      }))
    ) {
      return;
    }

    try {
      setError('');
      await masterApi.updateClinic(clinic.id, {
        active: !clinic.active,
      });
      await loadClinics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o status da unidade.');
    }
  }

  function updateAddress(field: keyof NonNullable<MasterClinicPayload['address']>, value: string) {
    setForm((current) => ({
      ...current,
      address: {
        ...(current.address ?? emptyForm.address!),
        [field]: value,
      },
    }));
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Unidades</h1>

              <p className="mt-1 text-sm text-slate-500">Administração global das unidades do HealthSync.</p>
            </div>
          </div>
        </div>

        <button type="button" onClick={openCreate} className="btn btn-primary">
          <Plus size={18} />
          Nova unidade
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : clinics.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <Building2 size={34} className="text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">Nenhuma unidade cadastrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{clinic.name}</h2>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        clinic.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {clinic.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-slate-500">
                    {clinic.document && <p>Documento: {clinic.document}</p>}
                    {clinic.phone && <p>{clinic.phone}</p>}
                    {clinic.email && <p>{clinic.email}</p>}
                    {clinic.address && (
                      <p>
                        {clinic.address.street}, {clinic.address.number} · {clinic.address.city}/
                        {clinic.address.state}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => openEdit(clinic)} className="btn btn-secondary btn-sm">
                    <Edit3 size={16} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleClinic(clinic)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      clinic.active
                        ? 'border border-red-200 text-red-700 hover:bg-red-50'
                        : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {clinic.active ? <Power size={16} /> : <CheckCircle2 size={16} />}

                    {clinic.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editing ? 'Editar unidade' : 'Nova unidade'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Informe os dados da unidade.</p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveClinic} className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Nome *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Documento</span>
                  <input
                    value={form.document ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        document: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Telefone</span>
                  <input
                    value={form.phone ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">E-mail</span>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        email: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-slate-800">Endereço</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1" htmlFor="master-clinic-cep">
                    <span className="text-sm font-medium text-slate-700">CEP</span>
                    <input
                      id="master-clinic-cep"
                      value={form.address?.cep ?? ''}
                      onChange={(event) => updateAddress('cep', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1" htmlFor="master-clinic-street">
                    <span className="text-sm font-medium text-slate-700">Rua</span>
                    <input
                      id="master-clinic-street"
                      value={form.address?.street ?? ''}
                      onChange={(event) => updateAddress('street', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1" htmlFor="master-clinic-number">
                    <span className="text-sm font-medium text-slate-700">Número</span>
                    <input
                      id="master-clinic-number"
                      value={form.address?.number ?? ''}
                      onChange={(event) => updateAddress('number', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1" htmlFor="master-clinic-complement">
                    <span className="text-sm font-medium text-slate-700">Complemento</span>
                    <input
                      id="master-clinic-complement"
                      value={form.address?.complement ?? ''}
                      onChange={(event) => updateAddress('complement', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1" htmlFor="master-clinic-district">
                    <span className="text-sm font-medium text-slate-700">Bairro</span>
                    <input
                      id="master-clinic-district"
                      value={form.address?.district ?? ''}
                      onChange={(event) => updateAddress('district', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1" htmlFor="master-clinic-city">
                    <span className="text-sm font-medium text-slate-700">Cidade</span>
                    <input
                      id="master-clinic-city"
                      value={form.address?.city ?? ''}
                      onChange={(event) => updateAddress('city', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1" htmlFor="master-clinic-state">
                    <span className="text-sm font-medium text-slate-700">Estado</span>
                    <input
                      id="master-clinic-state"
                      value={form.address?.state ?? ''}
                      onChange={(event) => updateAddress('state', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-primary"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>

                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editing ? 'Salvar alterações' : 'Cadastrar unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
