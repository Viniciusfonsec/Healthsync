import { formatDateTimeShort } from '../../lib/format';
import { useErrorToast } from '../../lib/notify';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  Users,
  Stethoscope,
  Bell,
  Settings,
  FileText,
  List,
  ArrowUpRight,
} from 'lucide-react';
import { adminApi, ApiError } from '../../lib/api';

interface DashboardData {
  totalUsers: number;
  totalAppointments: number;
  totalAttendances: number;
  attendanceRate: number;
}

interface AuditLog {
  id: string;
  action?: string;
  resource?: string;
  actorUserId?: string;
  createdAt?: string;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    async function load() {
      try {
        const [dashboard, audit] = await Promise.all([adminApi.dashboard(), adminApi.auditLogs()]);
        setData(dashboard as DashboardData);
        setLogs((audit.data ?? []).slice(0, 6) as AuditLog[]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o dashboard.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const cards = [
    {
      label: 'Usuários',
      value: data?.totalUsers ?? 0,
      icon: Users,
      bg: 'bg-brand-50',
      text: 'text-brand-600',
      path: '/admin/users',
    },
    {
      label: 'Consultas',
      value: data?.totalAppointments ?? 0,
      icon: Calendar,
      bg: 'bg-brand-50',
      text: 'text-brand-600',
      path: '/admin/reports',
    },
    {
      label: 'Atendimentos',
      value: data?.totalAttendances ?? 0,
      icon: Stethoscope,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      path: '/admin/reports',
    },
    {
      label: 'Taxa de atendimento',
      value: `${Math.round((data?.attendanceRate ?? 0) * 100)}%`,
      icon: CheckCircle2,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      path: '/admin/reports',
    },
  ];

  const quickLinks = [
    { label: 'Usuários', description: 'Cadastrar e gerenciar acessos', path: '/admin/users', icon: Users },
    {
      label: 'Profissionais',
      description: 'Dados e vínculos dos profissionais',
      path: '/admin/professionals',
      icon: Stethoscope,
    },
    {
      label: 'Especialidades',
      description: 'Configurar especialidades da clínica',
      path: '/admin/specialties',
      icon: FileText,
    },
    {
      label: 'Relatórios',
      description: 'Consultar indicadores e resultados',
      path: '/admin/reports',
      icon: Calendar,
    },
    { label: 'Notificações', description: 'Ver avisos da conta', path: '/admin/notifications', icon: Bell },
    { label: 'Logs', description: 'Auditar ações recentes', path: '/admin/logs', icon: List },
    {
      label: 'Configurações',
      description: 'Ajustar configurações da clínica',
      path: '/admin/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Administrativo</h1>
        <p className="text-slate-500 mt-1">Indicadores calculados diretamente pelo backend HealthSync.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex items-center justify-center text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando indicadores…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  type="button"
                  key={card.label}
                  onClick={() => navigate(card.path)}
                  className="group bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                    </div>
                    <div className={`rounded-xl p-2.5 ${card.bg} ${card.text}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <span className="card-action mt-4">
                    Abrir módulo <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Acesso rápido</h2>
              <p className="mt-1 text-sm text-slate-500">
                Abra qualquer módulo administrativo diretamente pelo dashboard.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 font-semibold text-slate-800">
                        {item.label}
                        <ArrowUpRight
                          size={15}
                          className="shrink-0 text-slate-400 group-hover:text-primary"
                        />
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Leitura dos indicadores</h2>
              </div>
              <div className="p-5 space-y-3 text-sm text-slate-600">
                <p>O total de usuários considera os registros disponíveis no repositório administrativo.</p>
                <p>
                  A taxa de atendimento é calculada pelo backend a partir da relação entre atendimentos e
                  consultas.
                </p>
                <p className="flex gap-2 items-start">
                  <AlertCircle size={16} className="mt-0.5 text-amber-500 shrink-0" /> Indicadores históricos
                  detalhados ficam disponíveis na área de Relatórios.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Logs recentes</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <div className="p-6 text-sm text-slate-400">Nenhum log registrado.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{log.action ?? 'Ação'}</p>
                        <p className="text-xs text-slate-500">{log.resource ?? '—'}</p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {log.createdAt ? formatDateTimeShort(log.createdAt) : '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
