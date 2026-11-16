import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Loader2, Plus, Power, Search, Stethoscope, X } from 'lucide-react';

import {
  masterApi,
  masterProfessionalsApi,
  masterSpecialtiesApi,
  type MasterClinic,
  type MasterProfessionalPayload,
  type Professional,
  type Specialty,
} from '../../lib/api';
import { maskPhone } from '../../lib/validation';
import { useConfirm } from '../../components/ConfirmDialog';

const emptyForm: MasterProfessionalPayload = {
  clinicId: '',
  clinicIds: [],
  allClinics: false,
  name: '',
  email: '',
  phone: '',
  crm: '',
  specialties: [],
  consultationDurationMinutes: 30,
  password: '',
};

export function MasterProfessionals() {
  const [confirm, confirmDialog] = useConfirm();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clinics, setClinics] = useState<MasterClinic[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [form, setForm] = useState<MasterProfessionalPayload>(emptyForm);

  async function load() {
    try {
      setLoading(true);
      setError('');

      const [professionalsResponse, clinicsResponse, specialtiesResponse] = await Promise.all([
        masterProfessionalsApi.list(),
        masterApi.clinics(),
        masterSpecialtiesApi.list(),
      ]);

      setProfessionals(professionalsResponse.data);
      setClinics(clinicsResponse.data);
      setSpecialties(specialtiesResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os profissionais.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const clinicMap = useMemo(() => new Map(clinics.map((clinic) => [clinic.id, clinic.name])), [clinics]);

  const specialtyMap = useMemo(
    () => new Map(specialties.map((specialty) => [specialty.id, specialty.name])),
    [specialties],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return professionals;
    }

    return professionals.filter((professional) => {
      const clinicName = clinicMap.get(professional.clinicId) ?? '';

      const specialtyNames = professional.specialties
        .map((id) => specialtyMap.get(id) ?? 'Especialidade não identificada')
        .join(' ');

      return `${professional.name} ${professional.email} ${professional.crm} ${clinicName} ${specialtyNames}`
        .toLowerCase()
        .includes(q);
    });
  }, [professionals, search, clinicMap, specialtyMap]);

  function openCreate() {
    setEditing(null);

    setForm({
      ...emptyForm,
      clinicId: '',
      clinicIds: [],
      allClinics: false,
      password: 'ChangeMe123!',
    });

    setError('');
    setModalOpen(true);
  }

  function openEdit(professional: Professional) {
    setEditing(professional);

    setForm({
      clinicId: professional.clinicId,
      clinicIds: professional.clinicIds?.length ? [...professional.clinicIds] : [professional.clinicId],
      allClinics:
        clinics.filter((clinic) => clinic.active).length > 0 &&
        (professional.clinicIds?.length ?? 1) >= clinics.filter((clinic) => clinic.active).length,
      name: professional.name,
      email: professional.email,
      phone: maskPhone(professional.phone),
      crm: professional.crm,
      specialties: [...professional.specialties],
      consultationDurationMinutes: professional.consultationDurationMinutes,
      password: '',
    });

    setError('');
    setModalOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      if (editing) {
        await masterProfessionalsApi.update(editing.id, {
          clinicId: form.clinicId,
          clinicIds: form.clinicIds ?? [],
          allClinics: form.allClinics ?? false,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.replace(/\D/g, ''),
          crm: form.crm.trim(),
          specialties: form.specialties,
          consultationDurationMinutes: form.consultationDurationMinutes,
        });
      } else {
        await masterProfessionalsApi.create({
          clinicId: form.clinicId,
          clinicIds: form.clinicIds ?? [],
          allClinics: form.allClinics ?? false,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.replace(/\D/g, ''),
          crm: form.crm.trim(),
          specialties: form.specialties,
          consultationDurationMinutes: form.consultationDurationMinutes,
          password: form.password?.trim() || 'ChangeMe123!',
        });
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o profissional.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(professional: Professional) {
    const action = professional.active ? 'desativar' : 'ativar';

    if (
      !(await confirm({
        message: `Deseja ${action} "${professional.name}"?`,
        confirmLabel: professional.active ? 'Desativar' : 'Ativar',
        danger: professional.active,
      }))
    ) {
      return;
    }

    try {
      setError('');

      await masterProfessionalsApi.update(professional.id, {
        active: !professional.active,
      });

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o status.');
    }
  }

  function toggleSpecialty(id: string) {
    setForm((current) => ({
      ...current,
      specialties: current.specialties.includes(id)
        ? current.specialties.filter((item) => item !== id)
        : [...current.specialties, id],
    }));
  }

  const availableSpecialties = specialties.filter(
    (specialty) =>
      specialty.active && (form.allClinics || (form.clinicIds ?? []).includes(specialty.clinicId)),
  );

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Stethoscope size={21} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profissionais</h1>

            <p className="mt-1 text-sm text-slate-500">
              Gestão global dos profissionais de todas as unidades.
            </p>
          </div>
        </div>

        <button type="button" onClick={openCreate} className="btn btn-primary">
          <Plus size={18} />
          Novo profissional
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

          <label htmlFor="master-professionals-search" className="sr-only">
            Pesquisar profissionais
          </label>
          <input
            id="master-professionals-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail, CRM ou unidade..."
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
          {filtered.map((professional) => (
            <div key={professional.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{professional.name}</h2>

                  <p className="mt-1 text-sm text-slate-500">{professional.email}</p>

                  <p className="mt-1 text-xs text-slate-400">
                    Principal: {clinicMap.get(professional.clinicId) ?? 'Unidade não identificada'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Vínculos:{' '}
                    {(professional.clinicIds?.length ? professional.clinicIds : [professional.clinicId])
                      .map((id) => clinicMap.get(id) ?? 'Unidade')
                      .join(', ')}
                  </p>
                </div>

                <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
                  <Stethoscope size={18} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {professional.specialties.map((id) => (
                  <span key={id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {specialtyMap.get(id) ?? 'Especialidade não identificada'}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">CRM</p>

                  <p className="font-medium text-slate-700">{professional.crm}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Duração</p>

                  <p className="font-medium text-slate-700">{professional.consultationDurationMinutes} min</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    professional.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {professional.active ? 'Ativo' : 'Inativo'}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(professional)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit3 size={15} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggle(professional)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      professional.active
                        ? 'border border-red-200 text-red-700'
                        : 'border border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {professional.active ? <Power size={15} /> : <CheckCircle2 size={15} />}

                    {professional.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">
              Nenhum profissional encontrado.
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editing ? 'Editar profissional' : 'Novo profissional'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={save} className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Clínica principal *</span>
                  <select
                    required
                    value={form.clinicId}
                    onChange={(event) => {
                      const clinicId = event.target.value;
                      setForm((current) => ({
                        ...current,
                        clinicId,
                        clinicIds: current.allClinics
                          ? clinics.filter((clinic) => clinic.active).map((clinic) => clinic.id)
                          : [...new Set([...(current.clinicIds ?? []), clinicId].filter(Boolean))],
                        specialties: [],
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  >
                    <option value="">Escolha a clínica principal</option>
                    {clinics
                      .filter((clinic) => clinic.active)
                      .map((clinic) => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label htmlFor="master-professional-name" className="text-sm font-medium text-slate-700">
                  Nome completo *
                </label>
                <input
                  id="master-professional-name"
                  required
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5"
                />

                <label htmlFor="master-professional-email" className="text-sm font-medium text-slate-700">
                  E-mail *
                </label>
                <input
                  id="master-professional-email"
                  required
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5"
                />

                <label htmlFor="master-professional-phone" className="text-sm font-medium text-slate-700">
                  Telefone *
                </label>
                <input
                  id="master-professional-phone"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={16}
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: maskPhone(event.target.value),
                    })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5"
                />

                <label htmlFor="master-professional-crm" className="text-sm font-medium text-slate-700">
                  CRM *
                </label>
                <input
                  id="master-professional-crm"
                  required
                  placeholder="CRM"
                  value={form.crm}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      crm: event.target.value,
                    })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5"
                />

                <label htmlFor="master-professional-duration" className="text-sm font-medium text-slate-700">
                  Duração da consulta (minutos) *
                </label>
                <input
                  id="master-professional-duration"
                  required
                  type="number"
                  min={5}
                  max={240}
                  value={form.consultationDurationMinutes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      consultationDurationMinutes: Number(event.target.value),
                    })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5"
                  placeholder="Duração em minutos"
                />

                {!editing && (
                  <>
                    <label
                      htmlFor="master-professional-password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Senha inicial *
                    </label>
                    <input
                      id="master-professional-password"
                      required
                      minLength={8}
                      type="password"
                      placeholder="Senha inicial"
                      value={form.password ?? ''}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          password: event.target.value,
                        })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </>
                )}
              </div>

              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">Vínculo com clínicas</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Escolha uma ou mais clínicas para habilitar o profissional nessas unidades.
                    </p>
                  </div>
                  <label className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-900">
                    <input
                      type="checkbox"
                      checked={Boolean(form.allClinics)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          allClinics: event.target.checked,
                          clinicIds: event.target.checked
                            ? clinics.filter((clinic) => clinic.active).map((clinic) => clinic.id)
                            : [...new Set([current.clinicId].filter(Boolean))],
                          specialties: event.target.checked
                            ? current.specialties
                            : current.specialties.filter((id) =>
                                specialties.some(
                                  (specialty) =>
                                    specialty.id === id && specialty.clinicId === current.clinicId,
                                ),
                              ),
                        }))
                      }
                    />
                    Vincular a todas as clínicas
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {clinics
                    .filter((clinic) => clinic.active)
                    .map((clinic) => {
                      const checked = Boolean(form.allClinics) || (form.clinicIds ?? []).includes(clinic.id);
                      const isPrimary = clinic.id === form.clinicId;
                      return (
                        <label
                          key={clinic.id}
                          className={`flex items-center gap-3 rounded-xl border p-3 ${checked ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={Boolean(form.allClinics) || isPrimary}
                            onChange={() =>
                              setForm((current) => ({
                                ...current,
                                clinicIds: checked
                                  ? (current.clinicIds ?? []).filter((id) => id !== clinic.id)
                                  : [...new Set([...(current.clinicIds ?? []), clinic.id])],
                                specialties: [],
                              }))
                            }
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-800">{clinic.name}</span>
                            <span className="block text-xs text-slate-500">
                              {isPrimary ? 'Clínica principal' : 'Clínica vinculada'}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </section>

              <div>
                <h3 className="mb-3 font-semibold text-slate-800">Especialidades</h3>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {availableSpecialties.map((specialty) => (
                    <label
                      key={specialty.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={form.specialties.includes(specialty.id)}
                        onChange={() => toggleSpecialty(specialty.id)}
                      />

                      <span className="text-sm text-slate-700">
                        {specialty.name}
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {clinicMap.get(specialty.clinicId) ?? 'Clínica não identificada'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>

                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving && <Loader2 size={16} className="animate-spin" />}

                  {editing ? 'Salvar alterações' : 'Cadastrar profissional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
