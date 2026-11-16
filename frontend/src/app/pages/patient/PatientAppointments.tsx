import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Video,
  RefreshCw,
  X,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { AddToCalendarMenu } from '../../components/AddToCalendarMenu';
import {
  ApiError,
  patientApi,
  type Appointment,
  type Clinic,
  type Professional,
  type Specialty,
} from '../../lib/api';

const TABS = ['Todas', 'Próximas', 'Realizadas', 'Canceladas'] as const;

type Tab = (typeof TABS)[number];

const STATUS_CONFIG = {
  CONFIRMADA: {
    label: 'Confirmada',
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  AGENDADA: {
    label: 'Agendada',
    icon: AlertCircle,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  REALIZADA: {
    label: 'Realizada',
    icon: CheckCircle,
    bg: 'bg-brand-50',
    text: 'text-brand-700',
  },
  CANCELADA: {
    label: 'Cancelada',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
  },
  FALTA: {
    label: 'Falta',
    icon: XCircle,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  },
} as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function isUpcoming(appointment: Appointment) {
  return (
    new Date(appointment.dateTime).getTime() > Date.now() &&
    (appointment.status === 'AGENDADA' || appointment.status === 'CONFIRMADA')
  );
}

export function PatientAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  const [clinics, setClinics] = useState<Clinic[]>([]);

  const [tab, setTab] = useState<Tab>('Todas');

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  useErrorToast(error);

  const [workingId, setWorkingId] = useState<string | null>(null);

  const [cancelId, setCancelId] = useState<string | null>(null);

  const [reason, setReason] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const appointmentsResponse = await patientApi.appointments();

      const loadedAppointments = appointmentsResponse.data ?? [];

      setAppointments(loadedAppointments);

      const clinicsResponse = await patientApi.clinics();

      const loadedClinics = clinicsResponse.data ?? [];

      setClinics(loadedClinics);

      const clinicIds = Array.from(
        new Set(
          loadedAppointments
            .map((appointment) => appointment.clinicId)
            .filter((clinicId): clinicId is string => typeof clinicId === 'string' && clinicId.length > 0),
        ),
      );

      /*
       * Se não houver clinicId em algum registro legado,
       * carregamos o catálogo das unidades ativas para
       * manter a tela funcional.
       */
      const idsToLoad =
        clinicIds.length > 0
          ? clinicIds
          : loadedClinics.filter((clinic) => clinic.active).map((clinic) => clinic.id);

      if (idsToLoad.length === 0) {
        setProfessionals([]);
        setSpecialties([]);
        return;
      }

      const [specialtyResponses, professionalResponses] = await Promise.all([
        Promise.all(idsToLoad.map((clinicId) => patientApi.specialties(clinicId))),
        Promise.all(idsToLoad.map((clinicId) => patientApi.professionals(clinicId))),
      ]);

      const allSpecialties = specialtyResponses.flatMap((response) => response.data ?? []);

      const allProfessionals = professionalResponses.flatMap((response) => response.data ?? []);

      setSpecialties(Array.from(new Map(allSpecialties.map((item) => [item.id, item])).values()));

      setProfessionals(Array.from(new Map(allProfessionals.map((item) => [item.id, item])).values()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar suas consultas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const professionalById = useMemo(
    () => new Map(professionals.map((item) => [item.id, item])),
    [professionals],
  );

  const specialtyById = useMemo(() => new Map(specialties.map((item) => [item.id, item])), [specialties]);

  const clinicById = useMemo(() => new Map(clinics.map((item) => [item.id, item])), [clinics]);

  const filtered = useMemo(() => {
    const result = appointments.filter((appointment) => {
      if (tab === 'Próximas') {
        return isUpcoming(appointment);
      }

      if (tab === 'Realizadas') {
        return appointment.status === 'REALIZADA';
      }

      if (tab === 'Canceladas') {
        return appointment.status === 'CANCELADA';
      }

      return true;
    });

    return [...result].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [appointments, tab]);

  async function confirm(id: string) {
    setWorkingId(id);
    setError('');

    try {
      await patientApi.confirm(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível confirmar a consulta.');
    } finally {
      setWorkingId(null);
    }
  }

  async function cancel() {
    if (!cancelId) {
      return;
    }

    setWorkingId(cancelId);
    setError('');

    try {
      await patientApi.cancel(cancelId, reason.trim() || 'Cancelamento solicitado pelo paciente');

      setCancelId(null);
      setReason('');

      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar a consulta.');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas Consultas</h1>

          <p className="text-slate-500 mt-1">Acompanhe seus agendamentos e atualize os próximos horários.</p>
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

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar consultas">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={`btn btn-sm whitespace-nowrap ${tab === item ? 'btn-primary' : 'btn-secondary'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500">
          Carregando consultas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <Calendar className="mx-auto text-slate-300 mb-3" size={40} />

          <p className="font-medium text-slate-700">Nenhuma consulta nesta categoria</p>

          <p className="text-sm text-slate-500 mt-1">Os dados exibidos aqui vêm diretamente do backend.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appointment) => {
            const professional = professionalById.get(appointment.professionalId);

            const specialty = specialtyById.get(appointment.specialtyId);

            const clinic = appointment.clinicId ? clinicById.get(appointment.clinicId) : undefined;

            const config = STATUS_CONFIG[appointment.status];

            const StatusIcon = config.icon;

            const busy = workingId === appointment.id;

            return (
              <div
                key={appointment.id}
                className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <User size={22} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {professional?.name ?? 'Profissional'}
                      </h3>

                      <p className="text-sm text-slate-500">{specialty?.name ?? 'Especialidade'}</p>

                      {clinic && (
                        <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
                          <Building2 size={14} />

                          <span>{clinic.name}</span>
                        </div>
                      )}

                      {appointment.insuranceUsed && (
                        <p className="mt-2 text-sm text-slate-600">
                          Convênio: <strong>{appointment.insuranceProvider ?? 'Informado'}</strong>
                          {appointment.insuranceMemberNumber
                            ? ` · Carteirinha ${appointment.insuranceMemberNumber}`
                            : ''}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} />
                          {formatDateTime(appointment.dateTime)}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          {appointment.type === 'TELEMEDICINA' ? <Video size={14} /> : <MapPin size={14} />}

                          {appointment.location}
                        </span>
                      </div>
                      {appointment.type === 'TELEMEDICINA' && appointment.teleconsultationUrl && (
                        <a
                          href={appointment.teleconsultationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm mt-3"
                        >
                          <Video size={15} /> Entrar na teleconsulta
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
                    >
                      <StatusIcon size={13} />
                      {config.label}
                    </span>

                    {(appointment.status === 'AGENDADA' || appointment.status === 'CONFIRMADA') &&
                      new Date(appointment.dateTime).getTime() > Date.now() && (
                        <AddToCalendarMenu
                          title={`Consulta - ${professional?.name ?? 'HealthSync'}`}
                          description={specialty?.name ?? 'Atendimento'}
                          location={appointment.location}
                          start={appointment.dateTime}
                          durationMinutes={appointment.durationMinutes}
                          appointmentId={appointment.id}
                          onSendEmail={() => patientApi.sendCalendarEmail(appointment.id)}
                          className="lg:justify-end"
                        />
                      )}

                    {appointment.status === 'AGENDADA' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void confirm(appointment.id)}
                          className="btn btn-success-solid btn-sm"
                        >
                          Confirmar
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            navigate(`/patient/schedule?remarcar=${encodeURIComponent(appointment.id)}`)
                          }
                          className="btn btn-secondary btn-sm"
                        >
                          <RefreshCw size={14} />
                          Remarcar
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setCancelId(appointment.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {appointment.status === 'CONFIRMADA' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            navigate(`/patient/schedule?remarcar=${encodeURIComponent(appointment.id)}`)
                          }
                          className="btn btn-secondary btn-sm"
                        >
                          <RefreshCw size={14} />
                          Remarcar
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setCancelId(appointment.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancelId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => {
            setCancelId(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Cancelar consulta</h2>

              <button
                type="button"
                onClick={() => {
                  setCancelId(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <>
              <p className="text-sm text-slate-500 mb-4">Informe o motivo do cancelamento.</p>

              <label htmlFor="cancel-reason" className="block text-sm font-medium text-slate-700 mb-2">
                Motivo do cancelamento
              </label>

              <textarea
                id="cancel-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full min-h-28 rounded-xl border border-slate-200 p-3 text-sm"
                placeholder="Motivo..."
              />

              <button
                type="button"
                disabled={workingId === cancelId}
                onClick={() => void cancel()}
                className="btn btn-danger-solid w-full mt-4"
              >
                {workingId === cancelId ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </>
          </div>
        </div>
      )}
    </div>
  );
}
