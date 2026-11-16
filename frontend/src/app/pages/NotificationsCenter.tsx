import { useErrorToast } from '../lib/notify';
import { formatDateTimeShort, stripSeconds } from '../lib/format';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Mail,
  MessageCircle,
  RefreshCw,
  ArrowRight,
  CalendarClock,
  Inbox,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { ApiError, notificationsApi, type Notification } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function roleTitle(role: string | undefined) {
  if (role === 'PACIENTE') return 'Suas notificações';
  if (role === 'PROFISSIONAL') return 'Avisos da agenda';
  if (role === 'ADMINISTRADOR') return 'Avisos administrativos';
  if (role === 'ADMIN_MASTER') return 'Avisos da rede';
  return 'Notificações';
}

export function NotificationsCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [markingAll, setMarkingAll] = useState(false);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      setError('');
      const response = await notificationsApi.list();
      setNotifications(response.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.email]);

  const unread = useMemo(() => notifications.filter((item) => !item.readAt), [notifications]);

  async function read(id: string) {
    try {
      await notificationsApi.read(id);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível marcar a notificação como lida.');
    }
  }

  async function readAll() {
    setMarkingAll(true);
    try {
      await notificationsApi.readAll();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível marcar as notificações como lidas.');
    } finally {
      setMarkingAll(false);
    }
  }

  function openRelated(item: Notification) {
    if (!item.readAt) void read(item.id);
    if (user?.role === 'PROFISSIONAL') {
      navigate(
        item.appointmentId
          ? `/professional/consultation?appointmentId=${encodeURIComponent(item.appointmentId)}`
          : '/professional/patients-today',
      );
    } else if (user?.role === 'PACIENTE') {
      navigate('/patient/appointments');
    } else if (user?.role === 'ADMINISTRADOR') {
      navigate('/admin/reports');
    } else if (user?.role === 'ADMIN_MASTER') {
      navigate('/master/professionals');
    }
  }

  const nextPath =
    user?.role === 'PROFISSIONAL'
      ? '/professional/patients-today'
      : user?.role === 'PACIENTE'
        ? '/patient/appointments'
        : user?.role === 'ADMINISTRADOR'
          ? '/admin/reports'
          : '/master/professionals';
  const nextLabel =
    user?.role === 'PROFISSIONAL'
      ? 'Ver pacientes do dia'
      : user?.role === 'PACIENTE'
        ? 'Ver minhas consultas'
        : user?.role === 'ADMINISTRADOR'
          ? 'Abrir relatórios'
          : 'Gerenciar profissionais';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell size={21} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{roleTitle(user?.role)}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Mensagens e atualizações relacionadas à sua conta.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load(false)}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button
            type="button"
            onClick={() => void readAll()}
            disabled={markingAll || unread.length === 0}
            className="btn btn-primary"
          >
            <CheckCheck size={16} />
            {markingAll ? 'Salvando...' : 'Marcar todas como lidas'}
          </button>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Todas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{notifications.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Não lidas</p>
            <p className="mt-1 text-2xl font-bold text-primary">{unread.length}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-1">
            <p className="text-sm text-slate-500">Acesso rápido</p>
            <button
              type="button"
              onClick={() => navigate(nextPath)}
              className="btn btn-secondary btn-sm mt-2"
            >
              {nextLabel}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Carregando notificações...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
            <Inbox size={28} />
          </span>
          <h2 className="mt-4 font-semibold text-slate-800">Tudo em dia</h2>
          <p className="mt-1 text-sm text-slate-500">
            Quando houver uma nova atualização, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...notifications]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border bg-white p-5 transition ${item.readAt ? 'border-slate-200' : 'border-brand-200 bg-brand-50/30'}`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.channel === 'WHATSAPP' ? 'bg-emerald-50 text-emerald-700' : item.channel === 'EMAIL' ? 'bg-brand-50 text-brand-700' : 'bg-primary/10 text-primary'}`}
                  >
                    {item.channel === 'WHATSAPP' ? (
                      <MessageCircle size={19} />
                    ) : item.channel === 'EMAIL' ? (
                      <Mail size={19} />
                    ) : (
                      <CalendarClock size={19} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-900">
                        {item.type === 'CONSULTA' ? 'Atualização de consulta' : item.type}
                      </h2>
                      {!item.readAt && (
                        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                          Não lida
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{stripSeconds(item.content)}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTimeShort(item.createdAt)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openRelated(item)}
                        className="btn btn-primary btn-sm"
                      >
                        Ver detalhes <ArrowRight size={14} />
                      </button>
                      {!item.readAt && user?.role !== 'PACIENTE' && (
                        <button
                          type="button"
                          onClick={() => void read(item.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}
