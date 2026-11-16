import { capitalizeFirst } from '../../lib/format';
import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, UserRound, ChevronLeft, ChevronRight, RefreshCw, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { ApiError, professionalApi, type Appointment } from '../../lib/api';
import { maskCpf } from '../../lib/validation';

function formatDate(date: Date) {
  return capitalizeFirst(
    new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfSelectedDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfSelectedDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function ProfessionalAgenda() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);

  async function loadAgenda(dateValue = selectedDate) {
    setLoading(true);
    setError('');

    try {
      const day = new Date(`${dateValue}T12:00:00`);

      const response = await professionalApi.agenda(startOfSelectedDay(day), endOfSelectedDay(day));

      setAppointments(response.data ?? []);
    } catch (err) {
      setAppointments([]);

      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a agenda.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgenda();
  }, [selectedDate, user?.clinicId]);

  const orderedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [appointments],
  );

  function changeDay(amount: number) {
    const current = new Date(`${selectedDate}T12:00:00`);

    current.setDate(current.getDate() + amount);

    setSelectedDate(toDateInputValue(current));
  }

  function openAppointment(appointment: Appointment) {
    navigate(
      `/professional/consultation?appointmentId=${encodeURIComponent(
        appointment.id,
      )}&date=${encodeURIComponent(selectedDate)}`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>

          <p className="text-slate-500 mt-1">Visualize suas consultas e abra o atendimento.</p>
          {user?.clinicId && (
            <p className="mt-2 text-sm font-medium text-primary">
              Unidade de trabalho:{' '}
              {user.availableClinics?.find((clinic) => clinic.id === user.clinicId)?.name ??
                'Unidade selecionada'}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={() => changeDay(-1)} className="btn btn-secondary">
            <ChevronLeft size={16} />
            Anterior
          </button>

          <label htmlFor="professional-agenda-date" className="sr-only">
            Data da agenda
          </label>
          <input
            id="professional-agenda-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-white text-slate-700"
          />

          <button type="button" onClick={() => changeDay(1)} className="btn btn-secondary">
            Próximo
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => void loadAgenda()}
            disabled={loading}
            className="btn btn-primary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
            <Calendar size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              {formatDate(new Date(`${selectedDate}T12:00:00`))}
            </h2>

            <p className="text-sm text-slate-500">
              {appointments.length} {appointments.length === 1 ? 'consulta' : 'consultas'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          Carregando agenda...
        </div>
      ) : orderedAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Calendar className="mx-auto text-slate-300" size={42} />

          <p className="mt-4 text-slate-600 font-medium">Nenhuma consulta para esta data.</p>

          <p className="mt-1 text-sm text-slate-400">
            Se a consulta foi criada para outro dia, selecione a data correspondente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedAppointments.map((appointment) => {
            const cancelled = appointment.status === 'CANCELADA';

            const finished = appointment.status === 'REALIZADA';

            return (
              <div key={appointment.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                      <UserRound size={21} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {appointment.patient?.name ?? 'Paciente agendado'}
                      </h3>
                      {appointment.patient && (
                        <div className="mt-1 grid gap-x-5 gap-y-1 text-xs text-slate-500 sm:grid-cols-2">
                          <span>Telefone: {appointment.patient.phone || 'Não informado'}</span>
                          <span>E-mail: {appointment.patient.email || 'Não informado'}</span>
                          {appointment.patient.cpf && <span>CPF: {maskCpf(appointment.patient.cpf)}</span>}
                          {appointment.patient.gender && (
                            <span>Sexo/gênero: {appointment.patient.gender}</span>
                          )}
                          {appointment.patient.bloodType && (
                            <span>Tipo sanguíneo: {appointment.patient.bloodType}</span>
                          )}
                          {appointment.patient.birthDate && (
                            <span>
                              Nascimento:{' '}
                              {new Intl.DateTimeFormat('pt-BR').format(
                                new Date(`${appointment.patient.birthDate}T12:00:00`),
                              )}
                            </span>
                          )}
                          {appointment.patient.plan && <span>Plano: {appointment.patient.plan}</span>}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} />
                          {formatTime(appointment.dateTime)}
                        </span>

                        <span>{appointment.durationMinutes} minutos</span>

                        <span>{appointment.type === 'TELEMEDICINA' ? 'Telemedicina' : 'Presencial'}</span>
                      </div>

                      <p className="text-sm text-slate-500 mt-2">{appointment.location}</p>
                      {appointment.type === 'TELEMEDICINA' && appointment.teleconsultationUrl && (
                        <a
                          href={appointment.teleconsultationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm mt-2"
                        >
                          Abrir sala de teleconsulta
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                        appointment.status === 'AGENDADA'
                          ? 'bg-brand-50 text-brand-700'
                          : appointment.status === 'CONFIRMADA'
                            ? 'bg-emerald-50 text-emerald-700'
                            : appointment.status === 'REALIZADA'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {appointment.status}
                    </span>

                    {!cancelled && !finished && (
                      <button
                        type="button"
                        onClick={() => openAppointment(appointment)}
                        className="btn btn-primary"
                      >
                        <Stethoscope size={16} />
                        Atender
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
