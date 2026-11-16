import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Mail, MessageCircle, RefreshCw } from 'lucide-react';
import { ApiError, patientApi, type Notification } from '../../lib/api';

export function PatientNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [marking, setMarking] = useState(false);

  async function load() {
    try {
      setError('');
      const response = await patientApi.notifications();
      setNotifications(response.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function read(id: string) {
    try {
      await patientApi.readNotification(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível marcar a notificação.');
    }
  }

  async function readAll() {
    setMarking(true);
    try {
      await patientApi.readAllNotifications();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível marcar as notificações.');
    } finally {
      setMarking(false);
    }
  }

  const unread = useMemo(() => notifications.filter((item) => !item.readAt), [notifications]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          <p className="text-slate-500 mt-1">Mensagens e lembretes produzidos pelo backend.</p>
        </div>
        <button
          disabled={marking || unread.length === 0}
          onClick={() => void readAll()}
          className="btn btn-secondary"
        >
          <CheckCheck size={17} />
          {marking ? 'Salvando...' : 'Marcar todas como lidas'}
        </button>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          Carregando...
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Bell className="mx-auto text-slate-300 mb-3" size={38} />
          <p className="font-medium text-slate-700">Nenhuma notificação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => (
              <button
                key={item.id}
                onClick={() => !item.readAt && void read(item.id)}
                className={`w-full text-left bg-white rounded-2xl border p-5 transition-colors ${item.readAt ? 'border-slate-200' : 'border-primary/30 bg-brand-50/30'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {item.channel === 'WHATSAPP' ? (
                      <MessageCircle size={19} />
                    ) : item.channel === 'EMAIL' ? (
                      <Mail size={19} />
                    ) : (
                      <Bell size={19} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-slate-900">{item.type}</div>
                      {!item.readAt && <span className="text-xs font-medium text-primary">Não lida</span>}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{item.content}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                        new Date(item.createdAt),
                      )}
                    </p>
                    {!item.readAt && <span className="card-action">Marcar como lida</span>}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
      {!loading && notifications.length > 0 && (
        <button onClick={() => void load()} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} aria-hidden="true" />
          Atualizar
        </button>
      )}
    </div>
  );
}
