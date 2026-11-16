import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  Bell,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';
import { ApiError, professionalApi, type Appointment } from '../../lib/api';

export function ProfessionalDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await professionalApi.agenda(startOfDay(new Date()), endOfDay(new Date()));
        if (!cancelled) setAppointments(response.data ?? []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.clinicId]);

  const completed = appointments.filter((appointment) => appointment.status === 'REALIZADA').length;
  const confirmed = appointments.filter((appointment) => appointment.status === 'CONFIRMADA').length;
  const waiting = appointments.filter((appointment) =>
    ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
  ).length;
  const next = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            new Date(appointment.dateTime) > new Date() &&
            ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
        )
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0],
    [appointments],
  );

  const cards = [
    {
      title: 'Consultas hoje',
      value: appointments.length,
      subtitle: 'Abrir pacientes do dia',
      icon: Users,
      iconClass: 'text-primary',
      action: () => navigate('/professional/patients-today'),
    },
    {
      title: 'Pendentes',
      value: waiting,
      subtitle: 'Ver agenda completa',
      icon: Clock,
      iconClass: 'text-amber-600',
      action: () => navigate('/professional/agenda'),
    },
    {
      title: 'Confirmadas',
      value: confirmed,
      subtitle: 'Ver pacientes do dia',
      icon: CalendarCheck,
      iconClass: 'text-emerald-600',
      action: () => navigate('/professional/patients-today'),
    },
    {
      title: 'Realizadas',
      value: completed,
      subtitle: 'Consultar histórico',
      icon: TrendingUp,
      iconClass: 'text-brand-600',
      action: () => navigate('/professional/history'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Profissional</h1>
          <p className="mt-1 text-slate-500">Acesse rapidamente sua agenda e os pacientes de hoje.</p>
        </div>
        <button type="button" onClick={() => navigate('/professional/agenda')} className="btn btn-secondary">
          <CalendarDays size={17} /> Abrir agenda
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Acesso rápido</h2>
          <p className="mt-1 text-sm text-slate-500">Abra diretamente as áreas de trabalho.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Pacientes do dia', path: '/professional/patients-today', icon: Users },
            { label: 'Agenda completa', path: '/professional/agenda', icon: CalendarDays },
            { label: 'Atendimento', path: '/professional/consultation', icon: ClipboardList },
            { label: 'Histórico', path: '/professional/history', icon: Clock },
            { label: 'Configurações', path: '/professional/settings', icon: Settings },
            { label: 'Notificações', path: '/professional/notifications', icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex min-h-24 flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <Icon size={19} className="text-primary" />
                <span className="mt-3 text-sm font-semibold text-slate-800">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={card.action}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Icon className={`${card.iconClass} mb-3`} size={21} />
              <div className="text-3xl font-bold text-slate-900">{loading ? '—' : card.value}</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{card.title}</div>
              <span className="card-action">
                {card.subtitle}
                <ArrowRight size={13} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Carregando consultas de hoje...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Próximo paciente</h2>
              <button
                type="button"
                onClick={() => navigate('/professional/patients-today')}
                className="btn btn-ghost btn-sm"
              >
                Ver todos
              </button>
            </div>
            {!next ? (
              <p className="mt-4 text-sm text-slate-500">
                Nenhum atendimento pendente para o restante do dia.
              </p>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users size={21} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Atendimento agendado</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                        new Date(next.dateTime),
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/professional/consultation?appointmentId=${encodeURIComponent(next.id)}`)
                  }
                  className="btn btn-primary mt-4 w-full"
                >
                  Abrir consulta <ArrowRight size={15} />
                </button>
              </>
            )}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Resumo dos atendimentos</h2>
              <button
                type="button"
                onClick={() => navigate('/professional/agenda')}
                className="btn btn-ghost btn-sm"
              >
                Abrir agenda
              </button>
            </div>
            <div className="mt-4 space-y-1">
              {appointments.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">Nenhuma consulta registrada para hoje.</p>
              ) : (
                appointments.slice(0, 6).map((appointment) => (
                  <button
                    type="button"
                    key={appointment.id}
                    onClick={() =>
                      navigate(
                        `/professional/consultation?appointmentId=${encodeURIComponent(appointment.id)}`,
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-slate-700">
                        {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(
                          new Date(appointment.dateTime),
                        )}
                      </span>
                      <span className="truncate text-sm text-slate-600">
                        {appointment.patient?.name ?? 'Paciente'}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
                      {appointment.status === 'REALIZADA' && <CheckCircle2 size={13} />} {appointment.status}
                      <ArrowRight size={13} />
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
