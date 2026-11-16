import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useErrorToast } from '../../lib/notify';
import { adminApi, ApiError } from '../../lib/api';

type Settings = {
  systemName: string;
  timezone: string;
  language: string;
  dateFormat: string;
  sessionTimeoutMinutes: number;
  minPasswordLength: number;
  logRetentionDays: number;
};

const DEFAULTS: Settings = {
  systemName: 'HealthSync',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  dateFormat: 'DD/MM/YYYY',
  sessionTimeoutMinutes: 360,
  minPasswordLength: 8,
  logRetentionDays: 90,
};

const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm';
const label = 'mb-1.5 block text-sm font-medium text-slate-700';
const hint = 'mt-1 text-xs text-slate-500';

/** Configurações do sistema: dados gerais e regras de segurança (sessão, senha e auditoria). */
export function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    adminApi
      .settings()
      .then((data) => {
        const loaded = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS) as Array<keyof Settings>) {
          if (data[key] !== undefined && data[key] !== null)
            (loaded as Record<string, unknown>)[key] = data[key];
        }
        setSettings(loaded);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as configurações.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminApi.updateSettings(settings);
      setMessage('Configurações salvas com sucesso. A nova duração de sessão vale para os próximos logins.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-10 text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={18} aria-hidden="true" /> Carregando…
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={save}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações do sistema</h1>
        <p className="mt-1 text-slate-500">Valem para todo o sistema e ficam registradas na auditoria.</p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Geral</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="admin-system-name" className={label}>
              Nome do sistema
            </label>
            <input
              id="admin-system-name"
              className={input}
              value={settings.systemName}
              onChange={(e) => set('systemName', e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="admin-timezone" className={label}>
              Fuso horário
            </label>
            <input
              id="admin-timezone"
              className={input}
              value={settings.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              placeholder="America/Sao_Paulo"
            />
            <p className={hint}>Usado na agenda e nos horários das notificações.</p>
          </div>
          <div>
            <label htmlFor="admin-language" className={label}>
              Idioma
            </label>
            <select
              id="admin-language"
              className={input}
              value={settings.language}
              onChange={(e) => set('language', e.target.value)}
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
          <div>
            <label htmlFor="admin-date-format" className={label}>
              Formato de data
            </label>
            <select
              id="admin-date-format"
              className={input}
              value={settings.dateFormat}
              onChange={(e) => set('dateFormat', e.target.value)}
            >
              <option value="DD/MM/YYYY">DD/MM/AAAA</option>
              <option value="MM/DD/YYYY">MM/DD/AAAA</option>
              <option value="YYYY-MM-DD">AAAA-MM-DD</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Segurança</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="admin-session-timeout" className={label}>
              Duração da sessão (minutos)
            </label>
            <input
              id="admin-session-timeout"
              type="number"
              min={5}
              max={1440}
              className={input}
              value={settings.sessionTimeoutMinutes}
              onChange={(e) => set('sessionTimeoutMinutes', Number(e.target.value))}
            />
            <p className={hint}>Depois desse tempo, é preciso entrar de novo. Padrão: 360 (6 horas).</p>
          </div>
          <div>
            <label htmlFor="admin-min-password" className={label}>
              Tamanho mínimo da senha
            </label>
            <input
              id="admin-min-password"
              type="number"
              min={8}
              max={64}
              className={input}
              value={settings.minPasswordLength}
              onChange={(e) => set('minPasswordLength', Number(e.target.value))}
            />
            <p className={hint}>Vale para novos cadastros e trocas de senha.</p>
          </div>
          <div>
            <label htmlFor="admin-log-retention" className={label}>
              Guardar auditoria por (dias)
            </label>
            <input
              id="admin-log-retention"
              type="number"
              min={1}
              max={3650}
              className={input}
              value={settings.logRetentionDays}
              onChange={(e) => set('logRetentionDays', Number(e.target.value))}
            />
            <p className={hint}>Registros mais antigos são apagados automaticamente.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </form>
  );
}
