import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Calendar, ChevronLeft, ChevronRight, Clock, UserRound } from 'lucide-react';
import { publicApi, ApiError, type Clinic, type PublicProfessional, type Specialty } from '../../lib/api';
import { useErrorToast } from '../../lib/notify';
import { WEEKDAY_NAMES } from '../../lib/format';
import { digitsOnly, isValidCpf } from '../../lib/validation';
import { BackButton } from '../../components/BackButton';
import { ScheduleStepper } from '../../components/ScheduleStepper';
import { AppointmentTypePicker, type AppointmentType } from '../../components/schedule/AppointmentTypePicker';
import { TimeSlotGrid } from '../../components/schedule/TimeSlotGrid';
import {
  EMPTY_GUEST,
  GuestDataStep,
  isGuestDataValid,
  type GuestData,
} from './public-schedule/GuestDataStep';
import { PublicScheduleSuccess } from './public-schedule/PublicScheduleSuccess';
import { formatDateTimeLong } from './public-schedule/formatDateTimeLong';

const STEPS = ['Escolha uma unidade', 'Especialidade', 'Profissional', 'Data e horário', 'Seus dados'];

type Slot = { dateTime: string; durationMinutes: number };

function localDateValue(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const selectClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3';

/** Agendamento sem login (US001 para visitantes): unidade → especialidade → profissional → horário → dados. */
export function PublicSchedule() {
  const routerLocation = useLocation();
  const [step, setStep] = useState(1);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [professionals, setProfessionals] = useState<PublicProfessional[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [clinicId, setClinicId] = useState(
    () => new URLSearchParams(routerLocation.search).get('clinicId') ?? '',
  );
  const [specialtyId, setSpecialtyId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [type, setType] = useState<AppointmentType>('PRESENCIAL');
  const [guest, setGuest] = useState<GuestData>(EMPTY_GUEST);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [created, setCreated] = useState<{
    id: string;
    dateTime: string;
    teleconsultationUrl?: string;
  } | null>(null);

  useEffect(() => {
    void publicApi
      .clinics()
      .then((response) => setClinics(response.data ?? []))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as unidades.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    setLoadingCatalog(true);
    setSpecialties([]);
    setProfessionals([]);
    Promise.all([publicApi.specialties(clinicId), publicApi.professionals(clinicId)])
      .then(([specialtyResponse, professionalResponse]) => {
        setSpecialties(specialtyResponse.data ?? []);
        setProfessionals(professionalResponse.data ?? []);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o catálogo da unidade.'),
      )
      .finally(() => setLoadingCatalog(false));
  }, [clinicId]);

  useEffect(() => {
    if (!professionalId || !date) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlots([]);
    publicApi
      .availability(professionalId, date)
      .then((response) => !cancelled && setSlots(response.data ?? []))
      .catch(
        (err) =>
          !cancelled &&
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os horários.'),
      )
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [professionalId, date]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const clinic = clinics.find((item) => item.id === clinicId);
  const specialty = specialties.find((item) => item.id === specialtyId);
  const professional = professionals.find((item) => item.id === professionalId);
  const duration = useMemo(
    () =>
      slots.find((slot) => slot.dateTime === dateTime)?.durationMinutes ??
      professional?.consultationDurationMinutes ??
      30,
    [slots, dateTime, professional],
  );
  const slotStillFree = slots.some((slot) => slot.dateTime === dateTime);
  const canSubmit =
    Boolean(clinicId && specialtyId && professionalId && slotStillFree) && isGuestDataValid(guest);

  /** Ao trocar uma escolha anterior, limpa as que dependem dela. */
  function resetFrom(level: 'clinic' | 'specialty' | 'professional') {
    if (level === 'clinic') setSpecialtyId('');
    if (level !== 'professional') setProfessionalId('');
    setDate('');
    setDateTime('');
    setSlots([]);
    setError('');
  }

  function next() {
    setError('');
    if (step === 1 && !clinicId) return setError('Escolha uma unidade para continuar.');
    if (step === 2 && !specialtyId) return setError('Selecione uma especialidade para continuar.');
    if (step === 3 && !professionalId) return setError('Selecione o profissional para continuar.');
    if (step === 4 && !dateTime) return setError('Selecione um horário disponível.');
    setStep((current) => Math.min(5, current + 1));
  }

  function back() {
    setError('');
    setStep((current) => Math.max(1, current - 1));
  }

  async function submit() {
    setError('');
    if (!canSubmit) {
      if (!isValidCpf(guest.cpf)) return setError('Informe um CPF válido.');
      if (digitsOnly(guest.phone).length < 10) return setError('Informe um telefone válido com DDD.');
      return setError(
        'Revise os campos obrigatórios e confirme se o horário selecionado continua disponível.',
      );
    }
    setSaving(true);
    try {
      const response = await publicApi.createAppointment({
        clinicId,
        specialtyId,
        professionalId,
        dateTime,
        durationMinutes: duration,
        type,
        location: type === 'PRESENCIAL' ? 'Consultório' : 'Atendimento on-line',
        name: guest.name,
        cpf: digitsOnly(guest.cpf),
        email: guest.email.trim().toLowerCase(),
        phone: digitsOnly(guest.phone),
        birthDate: guest.birthDate,
        gender: guest.gender,
        priorities: guest.priorities,
        lgpdConsentAccepted: guest.shareDataAccepted,
        insuranceUsed: guest.insuranceUsed,
        insuranceProvider: guest.insuranceUsed ? guest.insuranceProvider.trim() : undefined,
        insuranceMemberNumber: guest.insuranceUsed ? guest.insuranceMemberNumber.trim() : undefined,
      });
      setCreated({
        id: response.appointment.id,
        dateTime,
        teleconsultationUrl: response.appointment.teleconsultationUrl,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir o agendamento.');
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    const insurance = guest.insuranceUsed
      ? `${guest.insuranceProvider}${guest.insuranceMemberNumber ? ` · Carteirinha ${guest.insuranceMemberNumber}` : ''}`
      : 'Particular';
    return (
      <PublicScheduleSuccess
        clinicName={clinic?.name}
        specialtyName={specialty?.name}
        professionalName={professional?.name}
        dateTime={created.dateTime}
        durationMinutes={duration}
        type={type}
        insurance={insurance}
        email={guest.email.trim().toLowerCase()}
        teleconsultationUrl={created.teleconsultationUrl}
        appointmentId={created.id}
      />
    );
  }

  const availability = professional?.availability ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agendar consulta</h1>
          <p className="mt-1 text-slate-500">Você pode agendar sem criar uma conta.</p>
        </div>
        <BackButton to="/" label="Voltar ao início" />
      </div>

      <ScheduleStepper steps={STEPS} current={step} />

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Carregando unidades...</div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Escolha uma unidade *</h2>
                <p className="text-sm text-slate-500">Selecione onde deseja ser atendido.</p>
              </div>
              <label htmlFor="public-clinic" className="block text-sm font-medium text-slate-700">
                Unidade *
              </label>
              <select
                id="public-clinic"
                value={clinicId}
                onChange={(e) => {
                  setClinicId(e.target.value);
                  setType('PRESENCIAL');
                  resetFrom('clinic');
                }}
                className={selectClass}
              >
                <option value="">Escolha uma unidade</option>
                {clinics.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Escolha a especialidade *</h2>
                <p className="text-sm text-slate-500">Unidade escolhida: {clinic?.name}</p>
              </div>
              {loadingCatalog ? (
                <div className="py-10 text-center text-slate-500">Carregando especialidades...</div>
              ) : (
                <>
                  <label htmlFor="public-specialty" className="block text-sm font-medium text-slate-700">
                    Especialidade *
                  </label>
                  <select
                    id="public-specialty"
                    value={specialtyId}
                    onChange={(e) => {
                      setSpecialtyId(e.target.value);
                      resetFrom('specialty');
                    }}
                    className={selectClass}
                  >
                    <option value="">Escolha uma especialidade</option>
                    {specialties
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </>
              )}
            </div>
          ) : step === 3 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Escolha o profissional *</h2>
                <p className="text-sm text-slate-500">Especialidade: {specialty?.name}</p>
              </div>
              <label htmlFor="public-professional" className="block text-sm font-medium text-slate-700">
                Profissional *
              </label>
              <select
                id="public-professional"
                value={professionalId}
                onChange={(e) => {
                  setProfessionalId(e.target.value);
                  resetFrom('professional');
                }}
                className={selectClass}
              >
                <option value="">Escolha um profissional</option>
                {professionals
                  .filter((item) => item.active && item.specialties.includes(specialtyId))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.crm}
                    </option>
                  ))}
              </select>
            </div>
          ) : step === 4 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Data e horário *</h2>
                <p className="text-sm text-slate-500">Profissional: {professional?.name}</p>
                {availability.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Clock size={15} aria-hidden="true" /> Dias e horários de atendimento
                    </p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {availability.map((item, index) => (
                        <p
                          key={`${item.dayOfWeek}-${item.startTime}-${index}`}
                          className="text-sm text-slate-600"
                        >
                          {WEEKDAY_NAMES[item.dayOfWeek]}: {item.startTime}–{item.endTime}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Os horários disponíveis aparecerão após selecionar a data.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="public-date" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Data *
                </label>
                <input
                  id="public-date"
                  type="date"
                  min={localDateValue()}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setDateTime('');
                  }}
                  className={selectClass}
                />
              </div>
              <TimeSlotGrid
                slots={slots}
                selected={dateTime}
                onSelect={(value) => {
                  setDateTime(value);
                  setError('');
                }}
                loading={loadingSlots}
                waitingForDate={!date}
              />
              <AppointmentTypePicker value={type} onChange={setType} />
            </div>
          ) : (
            <GuestDataStep
              guest={guest}
              onChange={(patch) => {
                setGuest((current) => ({ ...current, ...patch }));
                setError('');
              }}
              summary={`${professional?.name} · ${specialty?.name} · ${dateTime ? formatDateTimeLong(dateTime) : 'horário não selecionado'}`}
            />
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 1 || saving}
              className="btn btn-secondary"
            >
              <ChevronLeft size={16} aria-hidden="true" /> Voltar
            </button>
            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                disabled={loadingCatalog || loadingSlots}
                className="btn btn-primary"
              >
                Continuar <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving || !canSubmit}
                title={
                  !canSubmit ? 'Preencha os campos obrigatórios e selecione um horário válido.' : undefined
                }
                className="btn btn-primary"
              >
                {saving ? 'Agendando...' : 'Confirmar agendamento'} <Calendar size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
        <UserRound size={14} aria-hidden="true" /> Não é necessário fazer login para agendar.
      </div>
    </div>
  );
}
