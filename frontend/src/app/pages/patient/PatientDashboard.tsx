import { useErrorToast } from '../../lib/notify';
import { firstNameOf, monthTitle } from '../../lib/format';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Bell,
  Video,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  ApiError,
  patientApi,
  type Appointment,
  type Clinic,
  type Professional,
  type Specialty,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  const [clinics, setClinics] = useState<Clinic[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  useErrorToast(error);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');

        const appointmentsResponse = await patientApi.appointments();

        const loadedAppointments = appointmentsResponse.data ?? [];

        setAppointments(loadedAppointments);

        const clinicsResponse = await patientApi.clinics();

        const loadedClinics = clinicsResponse.data ?? [];

        setClinics(loadedClinics);

        /*
         * O paciente pode ter consultas em unidades
         * diferentes. Por isso carregamos o catálogo
         * de cada unidade presente nos agendamentos.
         */
        const clinicIds = Array.from(
          new Set(
            loadedAppointments
              .map((appointment) => appointment.clinicId)
              .filter((clinicId): clinicId is string => typeof clinicId === 'string' && clinicId.length > 0),
          ),
        );

        if (clinicIds.length === 0) {
          setProfessionals([]);
          setSpecialties([]);
          return;
        }

        const [professionalResponses, specialtyResponses] = await Promise.all([
          Promise.all(clinicIds.map((clinicId) => patientApi.professionals(clinicId))),
          Promise.all(clinicIds.map((clinicId) => patientApi.specialties(clinicId))),
        ]);

        const allProfessionals = professionalResponses.flatMap((response) => response.data ?? []);

        const allSpecialties = specialtyResponses.flatMap((response) => response.data ?? []);

        const uniqueProfessionals = Array.from(
          new Map(allProfessionals.map((item) => [item.id, item])).values(),
        );

        const uniqueSpecialties = Array.from(new Map(allSpecialties.map((item) => [item.id, item])).values());

        setProfessionals(uniqueProfessionals);

        setSpecialties(uniqueSpecialties);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o dashboard.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const upcoming = useMemo(
    () =>
      [...appointments]
        .filter(
          (appointment) =>
            (appointment.status === 'AGENDADA' || appointment.status === 'CONFIRMADA') &&
            new Date(appointment.dateTime) > new Date(),
        )
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [appointments],
  );

  const next = upcoming[0];

  const professional = next ? professionals.find((item) => item.id === next.professionalId) : undefined;

  const specialty = next ? specialties.find((item) => item.id === next.specialtyId) : undefined;

  const clinic = next?.clinicId ? clinics.find((item) => item.id === next.clinicId) : undefined;

  const confirmedCount = appointments.filter((appointment) => appointment.status === 'CONFIRMADA').length;

  const firstName = firstNameOf(user?.name, user?.email);

  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthDays = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const calendarStart = new Date(first);
    calendarStart.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(calendarStart);
      day.setDate(calendarStart.getDate() + index);
      return day;
    });
  }, [visibleMonth]);
  const monthAppointments = useMemo(
    () =>
      appointments
        .filter((a) => {
          const d = new Date(a.dateTime);
          return d.getFullYear() === visibleMonth.getFullYear() && d.getMonth() === visibleMonth.getMonth();
        })
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [appointments, visibleMonth],
  );
  const selectedDayAppointments = useMemo(
    () => monthAppointments.filter((a) => dayKey(new Date(a.dateTime)) === selectedCalendarDay),
    [monthAppointments, selectedCalendarDay],
  );
  const appointmentCountForDay = (day: Date) =>
    monthAppointments.filter((a) => dayKey(new Date(a.dateTime)) === dayKey(day)).length;
  const changeMonth = (amount: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
    setVisibleMonth(next);
    setSelectedCalendarDay(dayKey(next));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {firstName}!</h1>

          <p className="text-slate-500">Aqui está um resumo atualizado da sua agenda.</p>
        </div>

        <button type="button" onClick={() => navigate('/patient/schedule')} className="btn btn-primary">
          Agendar consulta
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate('/patient/history')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="text-3xl font-bold text-slate-900">{appointments.length}</div>
          <div className="mt-1 text-sm text-slate-500">Consultas no seu histórico</div>
          <span className="card-action">
            Abrir histórico <ChevronRight size={13} aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient/appointments')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="text-3xl font-bold text-slate-900">{upcoming.length}</div>
          <div className="mt-1 text-sm text-slate-500">Próximas consultas</div>
          <span className="card-action">
            Ver consultas <ChevronRight size={13} aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient/appointments')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="text-3xl font-bold text-emerald-600">{confirmedCount}</div>
          <div className="mt-1 text-sm text-slate-500">Confirmadas</div>
          <span className="card-action">
            Ver confirmações <ChevronRight size={13} aria-hidden="true" />
          </span>
        </button>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Acesso rápido</h2>
          <p className="mt-1 text-sm text-slate-500">Acesse as principais áreas da sua conta.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Agendar consulta', path: '/patient/schedule', icon: Calendar },
            { label: 'Minhas consultas', path: '/patient/appointments', icon: Clock },
            { label: 'Notificações', path: '/patient/notifications', icon: Bell },
            { label: 'Meu perfil', path: '/patient/profile', icon: User },
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

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Calendário mensal</h2>
            <p className="mt-1 text-sm text-slate-500">Visão das consultas no mês selecionado.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => changeMonth(-1)}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-36 text-center font-semibold text-slate-800">
              {monthTitle(visibleMonth)}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => changeMonth(1)}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
            const key = dayKey(day);
            const count = appointmentCountForDay(day);
            const inMonth = day.getMonth() === visibleMonth.getMonth();
            const selected = key === selectedCalendarDay;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedCalendarDay(key);
                  if (!inMonth) setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                }}
                className={`min-h-14 rounded-lg border p-1 text-sm transition-colors ${selected ? 'border-primary bg-primary text-white' : inMonth ? 'border-slate-100 text-slate-700 hover:border-primary/50' : 'border-transparent text-slate-300'} ${count && !selected ? 'bg-brand-50' : ''}`}
              >
                <span>{day.getDate()}</span>
                {count > 0 && (
                  <span
                    className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : 'bg-primary'}`}
                    title={`${count} consulta(s)`}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="font-semibold text-slate-800">
            Consultas de{' '}
            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(
              new Date(`${selectedCalendarDay}T12:00:00`),
            )}
          </h3>
          {selectedDayAppointments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nenhuma consulta para este dia.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {selectedDayAppointments.map((appointment) => {
                const prof = professionals.find((item) => item.id === appointment.professionalId);
                const specialtyItem = specialties.find((item) => item.id === appointment.specialtyId);
                const clinicItem = clinics.find((item) => item.id === appointment.clinicId);
                return (
                  <button
                    type="button"
                    key={appointment.id}
                    onClick={() => navigate('/patient/appointments')}
                    className="flex w-full flex-col gap-2 rounded-xl border border-slate-100 p-3 text-left transition hover:border-brand-200 hover:bg-brand-50/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(
                          new Date(appointment.dateTime),
                        )}{' '}
                        · {prof?.name ?? 'Profissional'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {specialtyItem?.name ?? 'Consulta'} · {clinicItem?.name ?? 'Unidade'}{' '}
                      </p>
                    </div>
                    <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {appointment.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Próxima consulta</h2>

            <p className="text-xs text-slate-500">Dados sincronizados com o backend</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/patient/appointments')}
            className="btn btn-ghost btn-sm"
          >
            Ver todas
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando...</div>
        ) : !next ? (
          <div className="p-8 text-center">
            <Calendar className="mx-auto text-slate-300 mb-3" size={38} />

            <p className="font-medium text-slate-700">Nenhuma próxima consulta</p>

            <p className="text-sm text-slate-500 mt-1">Agende um novo horário para começar.</p>
          </div>
        ) : (
          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User size={25} />
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">
                  {professional?.name ?? 'Profissional'}
                </h3>

                <p className="text-sm text-slate-500">{specialty?.name ?? 'Especialidade'}</p>

                {clinic && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
                    <Building2 size={14} />

                    <span className="truncate">{clinic.name}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} />
                    {formatDate(next.dateTime)}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    {next.type === 'TELEMEDICINA' ? <Video size={14} /> : <MapPin size={14} />}

                    {next.location}
                  </span>
                </div>
                {next.type === 'TELEMEDICINA' && next.teleconsultationUrl && (
                  <a
                    href={next.teleconsultationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm mt-3"
                  >
                    <Video size={15} /> Abrir sala de teleconsulta
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  next.status === 'CONFIRMADA'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {next.status === 'CONFIRMADA' ? 'Confirmada' : 'Agendada'}
              </span>

              <button
                type="button"
                onClick={() => navigate('/patient/appointments')}
                aria-label="Ver detalhes da consulta"
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate('/patient/history')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="text-emerald-600" />

            <div>
              <h3 className="font-semibold text-slate-900">Histórico</h3>

              <p className="text-sm text-slate-500">Consulte atendimentos já realizados.</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/patient/notifications')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary/40"
        >
          <div className="flex items-center gap-3">
            <Bell className="text-primary" />

            <div>
              <h3 className="font-semibold text-slate-900">Notificações</h3>

              <p className="text-sm text-slate-500">Veja lembretes e comunicações da sua agenda.</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
