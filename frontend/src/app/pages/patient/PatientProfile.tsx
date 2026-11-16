import { useErrorToast } from '../../lib/notify';
import { useEffect, useState } from 'react';
import { User, MapPin, Shield, Save, CheckCircle, LockKeyhole } from 'lucide-react';
import { ApiError, changePassword, patientApi } from '../../lib/api';
import { maskPhone } from '../../lib/validation';
import { PrioritySelector } from '../../components/PrioritySelector';
import type { PatientPriority } from '../../lib/priorities';

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-slate-50 text-slate-700';

export function PatientProfile() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    bloodType: '',
    plan: '',
  });

  const [priorities, setPriorities] = useState<PatientPriority[]>([]);
  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    async function load() {
      try {
        const data = await patientApi.profile();

        setForm({
          name: data.name ?? '',
          email: data.email ?? '',
          phone: maskPhone(data.phone ?? ''),
          birthDate: data.birthDate ?? '',
          gender: data.gender ?? '',
          bloodType: data.bloodType ?? '',
          plan: data.plan ?? '',
        });

        setPriorities(data.priorities ?? []);

        setAddress({
          street: data.address?.street ?? '',
          number: data.address?.number ?? '',
          complement: data.address?.complement ?? '',
          neighborhood: data.address?.neighborhood ?? '',
          city: data.address?.city ?? '',
          state: data.address?.state ?? '',
          zipCode: data.address?.zipCode ?? '',
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar seu perfil.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      await patientApi.updateProfile({
        ...form,
        phone: form.phone.replace(/\D/g, ''),
        priorities,
        address,
      });

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    setSaving(true);
    setError('');

    try {
      await changePassword(currentPassword, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível alterar a senha.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
        <p className="text-slate-500 mt-1">Seus dados são carregados e salvos no backend.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 inline-flex items-center gap-2">
          <CheckCircle size={16} />
          Alterações salvas com sucesso.
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
            <User size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Dados pessoais</h2>

            <p className="text-xs text-slate-500">Informações cadastrais e contato</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm text-slate-600">
            Nome
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            E-mail
            <input
              className={inputCls}
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Telefone
            <input
              className={inputCls}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={16}
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: maskPhone(e.target.value),
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Data de nascimento
            <input
              className={inputCls}
              type="date"
              value={form.birthDate?.slice(0, 10)}
              onChange={(e) =>
                setForm({
                  ...form,
                  birthDate: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Gênero
            <input
              className={inputCls}
              value={form.gender}
              onChange={(e) =>
                setForm({
                  ...form,
                  gender: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Tipo sanguíneo
            <input
              className={inputCls}
              value={form.bloodType}
              onChange={(e) =>
                setForm({
                  ...form,
                  bloodType: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Plano
            <input
              className={inputCls}
              value={form.plan}
              onChange={(e) =>
                setForm({
                  ...form,
                  plan: e.target.value,
                })
              }
            />
          </label>
        </div>

        <div className="mt-5">
          <PrioritySelector
            value={priorities}
            onChange={setPriorities}
            idPrefix="profile-priority"
            disabled={saving}
          />
        </div>

        <button disabled={saving} onClick={() => void saveProfile()} className="btn btn-primary mt-5">
          <Save size={16} />

          {saving ? 'Salvando...' : 'Salvar dados'}
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <MapPin size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Endereço</h2>

            <p className="text-xs text-slate-500">Utilizado para informações do atendimento.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm text-slate-600">
            Rua
            <input
              className={inputCls}
              value={address.street}
              onChange={(e) =>
                setAddress({
                  ...address,
                  street: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Número
            <input
              className={inputCls}
              value={address.number}
              onChange={(e) =>
                setAddress({
                  ...address,
                  number: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Complemento
            <input
              className={inputCls}
              value={address.complement}
              onChange={(e) =>
                setAddress({
                  ...address,
                  complement: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Bairro
            <input
              className={inputCls}
              value={address.neighborhood}
              onChange={(e) =>
                setAddress({
                  ...address,
                  neighborhood: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Cidade
            <input
              className={inputCls}
              value={address.city}
              onChange={(e) =>
                setAddress({
                  ...address,
                  city: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            Estado
            <input
              className={inputCls}
              value={address.state}
              onChange={(e) =>
                setAddress({
                  ...address,
                  state: e.target.value,
                })
              }
            />
          </label>

          <label className="text-sm text-slate-600">
            CEP
            <input
              className={inputCls}
              value={address.zipCode}
              onChange={(e) =>
                setAddress({
                  ...address,
                  zipCode: e.target.value,
                })
              }
            />
          </label>
        </div>

        <button disabled={saving} onClick={() => void saveProfile()} className="btn btn-secondary mt-5">
          <Save size={16} />
          Salvar endereço
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Shield size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Segurança</h2>

            <p className="text-xs text-slate-500">Altere sua senha sem sair do sistema.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm text-slate-600">
            Senha atual
            <input
              className={inputCls}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

          <label className="text-sm text-slate-600">
            Nova senha
            <input
              className={inputCls}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>

        <button
          disabled={saving || !currentPassword || newPassword.length < 8}
          onClick={() => void savePassword()}
          className="btn btn-primary mt-5"
        >
          <LockKeyhole size={16} />
          Alterar senha
        </button>
      </section>
    </div>
  );
}
