import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, User, Stethoscope, ArrowRight, Search, Video, X, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useNavigate } from 'react-router';
import { useErrorToast } from '../../lib/notify';
import { useAuth } from '../../context/AuthContext';
import { ApiError, professionalApi, type Appointment } from '../../lib/api';
import { maskCpf } from '../../lib/validation';
import {
  filterPatientsOfTheDay,
  formatWeekdayDate,
  statusLabel,
  type PriorityFilter,
} from '../../lib/format';
import { PRIORITY_OPTIONS } from '../../lib/priorities';
import { PriorityBadges } from '../../components/PriorityBadges';
import { useConfirm } from '../../components/ConfirmDialog';

const STATUS_TONE: Record<string, string> = {
  REALIZADA: 'bg-brand-50 text-brand-700',
  CONFIRMADA: 'bg-emerald-50 text-emerald-700',
  CANCELADA: 'bg-red-50 text-red-700',
  FALTA: 'bg-slate-100 text-slate-600',
};

export function ProfessionalPatientsToday() {
  const [confirm, confirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<PriorityFilter>('TODOS');

  useEffect(() => {
    async function load() {
      try {
        const response = await professionalApi.agenda(startOfDay(new Date()), endOfDay(new Date()));
        setAppointments(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os pacientes.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user?.clinicId]);

  const ordered = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [appointments],
  );
  const visible = useMemo(() => filterPatientsOfTheDay(ordered, query, priority), [ordered, query, priority]);
  const filtering = query.trim() !== '' || priority !== 'TODOS';
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function markNoShow(appointment: Appointment) {
    const name = appointment.patient?.name ?? 'o paciente';
    if (
      !(await confirm({
        title: 'Registrar falta',
        message: `Confirmar que ${name} não compareceu à consulta? A consulta passa para "Falta" e entra no relatório de faltas.`,
        confirmLabel: 'Registrar falta',
        danger: true,
      }))
    )
      return;
    setMarkingId(appointment.id);
    try {
      const updated = await professionalApi.markNoShow(appointment.id);
      setAppointments((current) =>
        current.map((item) => (item.id === appointment.id ? { ...item, status: updated.status } : item)),
      );
      toast.success('Falta registrada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível registrar a falta.');
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pacientes do Dia</h1>
        <p className="mt-1 text-slate-500">{formatWeekdayDate()}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!loading && ordered.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="patients-search" className="mb-1.5 block text-sm font-medium text-slate-700">
              Buscar paciente
            </label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="patients-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o nome do paciente"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <div className="sm:w-60">
            <label htmlFor="patients-priority" className="mb-1.5 block text-sm font-medium text-slate-700">
              Preferência de atendimento
            </label>
            <select
              id="patients-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as PriorityFilter)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
            >
              <option value="TODOS">Todos os pacientes</option>
              <option value="PRIORITARIOS">Somente prioritários</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setPriority('TODOS');
              }}
              className="btn btn-secondary"
            >
              <X size={15} aria-hidden="true" /> Limpar filtros
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Carregando...
        </div>
      ) : ordered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Nenhuma consulta para hoje.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Nenhum paciente encontrado com esse filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filtering && (
            <p className="text-sm text-slate-500" aria-live="polite">
              {visible.length} de {ordered.length} pacientes
            </p>
          )}
          {visible.map((appointment) => (
            <div
              key={appointment.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {appointment.patient?.name ?? 'Paciente agendado'}
                  </h3>
                  <PriorityBadges patient={appointment.patient} className="mt-1" />
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.patient?.phone ?? 'Atendimento do dia'}
                    {appointment.patient?.email ? ` · ${appointment.patient.email}` : ''}
                    {appointment.patient?.cpf ? ` · CPF ${maskCpf(appointment.patient.cpf)}` : ''}
                  </p>
                  {appointment.patient?.birthDate && (
                    <p className="mt-1 text-xs text-slate-500">
                      Nascimento:{' '}
                      {new Intl.DateTimeFormat('pt-BR').format(
                        new Date(`${appointment.patient.birthDate}T12:00:00`),
                      )}
                    </p>
                  )}
                  {appointment.patient?.plan && (
                    <p className="mt-1 text-xs text-slate-500">Plano: {appointment.patient.plan}</p>
                  )}
                  {appointment.insuranceUsed && (
                    <p className="mt-1 text-xs font-medium text-slate-700">
                      Convênio deste atendimento: {appointment.insuranceProvider ?? 'Informado'}
                      {appointment.insuranceMemberNumber
                        ? ` · Carteirinha ${appointment.insuranceMemberNumber}`
                        : ''}
                    </p>
                  )}
                  {appointment.type === 'TELEMEDICINA' && appointment.teleconsultationUrl && (
                    <a
                      className="btn btn-secondary btn-sm mt-2"
                      href={appointment.teleconsultationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Video size={14} aria-hidden="true" /> Abrir teleconsulta
                    </a>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} />
                      {format(new Date(appointment.dateTime), 'HH:mm')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={14} />
                      {appointment.durationMinutes} min
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${STATUS_TONE[appointment.status] ?? 'bg-amber-50 text-amber-700'}`}
                >
                  {statusLabel(appointment.status)}
                </span>
                {(appointment.status === 'AGENDADA' || appointment.status === 'CONFIRMADA') &&
                  new Date(appointment.dateTime).getTime() <= Date.now() && (
                    <button
                      type="button"
                      onClick={() => void markNoShow(appointment)}
                      disabled={markingId === appointment.id}
                      className="btn btn-secondary"
                    >
                      <UserX size={15} />
                      Registrar falta
                    </button>
                  )}
                {(appointment.status === 'AGENDADA' || appointment.status === 'CONFIRMADA') && (
                  <button
                    type="button"
                    onClick={() => navigate(`/professional/consultation?appointmentId=${appointment.id}`)}
                    className="btn btn-primary"
                  >
                    <Stethoscope size={15} />
                    Atender
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
