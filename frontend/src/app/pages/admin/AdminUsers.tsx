import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Search, UserPlus, X } from 'lucide-react';
import { adminApi, ApiError } from '../../lib/api';
import { isValidCpf, maskCpf, maskPhone } from '../../lib/validation';

interface AdminUser {
  name: string;
  email: string;
  clinicName?: string;
  role: string;
  active: boolean;
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-slate-50';

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const emptyForm = {
    name: '',
    cpf: '',
    email: '',
    password: '',
    phone: '',
    birthDate: '',
    gender: '',
    plan: 'Básico',
  };
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useErrorToast(error);

  async function load() {
    setLoading(true);
    try {
      const result = await adminApi.users();
      setUsers(result.data as AdminUser[]);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const q = search.toLowerCase();
        return (
          !q ||
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.role.toLowerCase().includes(q)
        );
      }),
    [users, search],
  );

  async function createPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCpf(form.cpf)) {
      setError('Informe um CPF válido.');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      setError('Informe um telefone válido com DDD.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminApi.createPatient({
        ...form,
        cpf: form.cpf.replace(/\D/g, ''),
        phone: form.phone.replace(/\D/g, ''),
      });
      setMessage('Paciente criado com sucesso.');
      setForm(emptyForm);
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o paciente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
          <p className="text-slate-500 mt-1">Usuários vinculados à unidade, com nome e dados de acesso.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <UserPlus size={16} /> Novo paciente
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
          <label htmlFor="admin-users-search" className="sr-only">
            Pesquisar usuários
          </label>
          <input
            id="admin-users-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou perfil…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-slate-500">
            <Loader2 className="animate-spin mr-2" size={18} /> Carregando…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Nome</th>
                  <th className="px-5 py-3.5">E-mail</th>
                  <th className="px-5 py-3.5">Perfil</th>
                  <th className="px-5 py-3.5">Unidade</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.email} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{user.name}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-800">
                        <Mail size={15} className="text-slate-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{user.clinicName ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <form
            onSubmit={createPatient}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Novo paciente</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Nome *</span>
                <input
                  id="admin-user-name"
                  name="name"
                  className={inputCls}
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">CPF *</span>
                <input
                  id="admin-user-cpf"
                  name="cpf"
                  className={inputCls}
                  required
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  aria-invalid={Boolean(form.cpf) && !isValidCpf(form.cpf)}
                  onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">E-mail *</span>
                <input
                  id="admin-user-email"
                  className={inputCls}
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Senha inicial *</span>
                <input
                  id="admin-user-password"
                  className={inputCls}
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Telefone *</span>
                <input
                  id="admin-user-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputCls}
                  required
                  value={form.phone}
                  maxLength={16}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Data de nascimento *</span>
                <input
                  id="admin-user-birth-date"
                  name="birthDate"
                  className={inputCls}
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Sexo/gênero *</span>
                <select
                  id="admin-user-gender"
                  name="gender"
                  className={inputCls}
                  required
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option>Feminino</option>
                  <option>Masculino</option>
                  <option>Outro</option>
                  <option>Prefiro não informar</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Plano</span>
                <input
                  id="admin-user-plan"
                  className={inputCls}
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando…' : 'Criar paciente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
