import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Check, ShieldCheck, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router';
import { BackButton } from '../../components/BackButton';
import { ScheduleStepper } from '../../components/ScheduleStepper';
import { ClinicStep } from './schedule/ClinicStep';
import { SpecialtyStep } from './schedule/SpecialtyStep';
import { ProfessionalStep } from './schedule/ProfessionalStep';
import { TimeSlotGrid } from '../../components/schedule/TimeSlotGrid';
import { AppointmentTypePicker } from '../../components/schedule/AppointmentTypePicker';
import { InsuranceFields } from '../../components/schedule/InsuranceFields';
import {
  ApiError,
  patientApi,
  publicApi,
  type Appointment,
  type Clinic,
  type Professional,
  type Specialty,
} from '../../lib/api';

function toIso(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);

  const local = new Date(date);

  local.setHours(hours, minutes, 0, 0);

  return local.toISOString();
}

export function PatientSchedule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Remarcar reaproveita esta tela: /patient/schedule?remarcar=<id da consulta>
  const rescheduleId = searchParams.get('remarcar');
  const isReschedule = Boolean(rescheduleId);
  const [original, setOriginal] = useState<Appointment | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(isReschedule);
  const [step, setStep] = useState(isReschedule ? 4 : 1);

  const [clinicId, setClinicId] = useState('');

  const [specialtyId, setSpecialtyId] = useState('');

  const [professionalId, setProfessionalId] = useState('');

  const [date, setDate] = useState<Date | null>(null);

  const [time, setTime] = useState('');

  const [type, setType] = useState<'PRESENCIAL' | 'TELEMEDICINA'>('PRESENCIAL');

  const location = type === 'PRESENCIAL' ? 'Consultório' : 'Atendimento on-line';
  const [insuranceUsed, setInsuranceUsed] = useState(false);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceMemberNumber, setInsuranceMemberNumber] = useState('');

  const [search, setSearch] = useState('');

  const [clinics, setClinics] = useState<Clinic[]>([]);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [loadingClinics, setLoadingClinics] = useState(true);

  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  useErrorToast(error);

  const [success, setSuccess] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ dateTime: string; durationMinutes: number }>>(
    [],
  );
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [teleconsultationUrl, setTeleconsultationUrl] = useState('');

  useEffect(() => {
    async function loadClinics() {
      try {
        setLoadingClinics(true);
        setError('');

        const response = await patientApi.clinics();

        setClinics(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as unidades.');
      } finally {
        setLoadingClinics(false);
      }
    }

    void loadClinics();
  }, []);

  useEffect(() => {
    if (!rescheduleId) return;
    let cancelled = false;
    setLoadingOriginal(true);
    patientApi
      .appointments()
      .then((response) => {
        if (cancelled) return;
        const found = (response.data ?? []).find((item) => String(item.id) === rescheduleId);
        const canReschedule =
          found &&
          (found.status === 'AGENDADA' || found.status === 'CONFIRMADA') &&
          new Date(found.dateTime).getTime() > Date.now();
        if (!found || !canReschedule) {
          setError('Esta consulta não pode ser remarcada.');
          navigate('/patient/appointments', { replace: true });
          return;
        }
        setOriginal(found);
        setClinicId(String(found.clinicId ?? ''));
        setSpecialtyId(String(found.specialtyId));
        setProfessionalId(String(found.professionalId));
        setType(found.type);
        setStep(4);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a consulta.');
        navigate('/patient/appointments', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoadingOriginal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rescheduleId, navigate]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!professionalId || !date) {
      setAvailableSlots([]);
      setTime('');
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setAvailableSlots([]);
    publicApi
      .availability(professionalId, format(date, 'yyyy-MM-dd'))
      .then((response) => {
        if (!cancelled) setAvailableSlots(response.data ?? []);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : 'Não foi possível carregar os horários disponíveis.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [professionalId, date]);

  useEffect(() => {
    if (!success || !clinicId || isReschedule) return;
    // Mantém os detalhes e o link da teleconsulta visíveis antes do redirecionamento.
    const timer = window.setTimeout(() => navigate(`/unidade/${clinicId}`), 10000);
    return () => window.clearTimeout(timer);
  }, [success, clinicId, isReschedule, navigate]);

  useEffect(() => {
    if (!clinicId) {
      setSpecialties([]);
      setProfessionals([]);
      return;
    }

    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        setError('');

        const [specialtyResponse, professionalResponse] = await Promise.all([
          patientApi.specialties(clinicId),
          patientApi.professionals(clinicId),
        ]);

        setSpecialties(specialtyResponse.data ?? []);

        setProfessionals(professionalResponse.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o catálogo da unidade.');
      } finally {
        setLoadingCatalog(false);
      }
    }

    void loadCatalog();
  }, [clinicId]);

  const selectedClinic = clinics.find((item) => item.id === clinicId);

  const selectedSpecialty = specialties.find((item) => item.id === specialtyId);

  const selectedProfessional = professionals.find((item) => item.id === professionalId);

  const candidates = professionals.filter(
    (professional) => professional.active && professional.specialties.includes(specialtyId),
  );

  const filteredSpecialties = specialties.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const nextDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1)).filter(
        (day) => !isBefore(startOfDay(day), startOfDay(new Date())),
      ),
    [],
  );

  function selectClinic(id: string) {
    setClinicId(id);
    setSpecialtyId('');
    setProfessionalId('');
    setDate(null);
    setTime('');
    setSearch('');
    setError('');
    setStep(2);
  }

  function selectSpecialty(id: string) {
    setSpecialtyId(id);
    setProfessionalId('');
    setDate(null);
    setTime('');
    setError('');
    setStep(3);
  }

  function selectProfessional(id: string) {
    setProfessionalId(id);
    setDate(null);
    setTime('');
    setError('');
    setStep(4);
  }

  async function handleConfirm() {
    if (
      !clinicId ||
      !date ||
      !time ||
      !selectedClinic ||
      !selectedProfessional ||
      !selectedSpecialty ||
      !availableSlots.some((slot) => format(new Date(slot.dateTime), 'HH:mm') === time)
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const chosenSlot =
        availableSlots.find((slot) => format(new Date(slot.dateTime), 'HH:mm') === time)?.dateTime ??
        toIso(date, time);

      if (rescheduleId) {
        const updated = await patientApi.reschedule(rescheduleId, chosenSlot);
        setTeleconsultationUrl(updated.teleconsultationUrl ?? original?.teleconsultationUrl ?? '');
        setSuccess(true);
        setStep(5);
        return;
      }

      const created = await patientApi.createAppointment({
        clinicId,
        professionalId,
        specialtyId,
        dateTime:
          availableSlots.find((slot) => format(new Date(slot.dateTime), 'HH:mm') === time)?.dateTime ??
          toIso(date, time),
        durationMinutes: selectedProfessional.consultationDurationMinutes,
        type,
        location,
        insuranceUsed,
        insuranceProvider: insuranceUsed ? insuranceProvider.trim() : undefined,
        insuranceMemberNumber: insuranceUsed ? insuranceMemberNumber.trim() : undefined,
      });

      setTeleconsultationUrl(created.teleconsultationUrl ?? '');
      setSuccess(true);
      setStep(5);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a consulta.');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep(1);
    setClinicId('');
    setSpecialtyId('');
    setProfessionalId('');
    setDate(null);
    setTime('');
    setType('PRESENCIAL');
    setInsuranceUsed(false);
    setInsuranceProvider('');
    setInsuranceMemberNumber('');
    setSuccess(false);
    setError('');
    setSearch('');
  }

  const stepLabels = ['Unidade *', 'Especialidade *', 'Profissional *', 'Data e Hora *'];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isReschedule ? 'Remarcar consulta' : 'Agendar consulta'}
        </h1>

        <p className="text-slate-500 mt-1">
          {isReschedule
            ? 'Escolha a nova data e o novo horário. Unidade, especialidade e profissional continuam os mesmos.'
            : 'Escolha uma unidade, especialidade, profissional e horário.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step < 5 && !isReschedule && <ScheduleStepper steps={stepLabels} current={step} />}

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {loadingClinics || loadingOriginal ? (
          <div className="py-12 text-center text-slate-500">Carregando unidades...</div>
        ) : step === 1 ? (
          <ClinicStep clinics={clinics} onSelect={selectClinic} />
        ) : loadingCatalog ? (
          <div className="py-12 text-center text-slate-500">Carregando catálogo da unidade...</div>
        ) : step === 2 ? (
          <SpecialtyStep
            clinicName={selectedClinic?.name}
            specialties={filteredSpecialties}
            search={search}
            onSearch={setSearch}
            onSelect={selectSpecialty}
            onBack={() => setStep(1)}
          />
        ) : step === 3 ? (
          <ProfessionalStep
            clinicName={selectedClinic?.name}
            specialtyName={selectedSpecialty?.name}
            professionals={candidates}
            onSelect={selectProfessional}
            onBack={() => setStep(2)}
          />
        ) : step === 4 ? (
          <div className="space-y-6">
            <BackButton
              onClick={() => (isReschedule ? navigate('/patient/appointments') : setStep(3))}
              className="w-fit"
            />

            <div>
              <h2 className="text-lg font-bold text-slate-900">Escolha a data e horário *</h2>

              <p className="text-sm text-slate-500 mt-1">
                Os horários abaixo vêm da disponibilidade cadastrada pelo profissional e são revalidados no
                momento da confirmação.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs text-slate-400 uppercase font-semibold">Unidade</p>

              <p className="font-semibold text-slate-900 mt-1">{selectedClinic?.name}</p>

              <p className="text-sm text-slate-500 mt-1">
                {selectedSpecialty?.name} · {selectedProfessional?.name}
              </p>
              {isReschedule && original && (
                <p className="text-sm text-slate-600 mt-2">
                  Horário atual:{' '}
                  <strong>{format(new Date(original.dateTime), "dd/MM/yyyy 'às' HH:mm")}</strong>
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <CalendarIcon size={16} />
                Datas
              </h3>

              <div
                className="flex gap-3 overflow-x-auto pb-2"
                role="radiogroup"
                aria-label="Datas disponíveis"
              >
                {nextDays.map((day) => (
                  <button
                    key={day.toISOString()}
                    type="button"
                    role="radio"
                    aria-checked={date?.toDateString() === day.toDateString()}
                    aria-label={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    onClick={() => {
                      setDate(day);
                      setTime('');
                    }}
                    className={`flex-shrink-0 w-16 h-20 rounded-xl border flex flex-col items-center justify-center ${
                      date?.toDateString() === day.toDateString()
                        ? 'bg-primary border-primary text-white'
                        : 'border-slate-200 text-slate-600 hover:border-primary'
                    }`}
                  >
                    <span className="text-xs uppercase">
                      {format(day, 'EEE', {
                        locale: ptBR,
                      })}
                    </span>

                    <span className="text-lg font-bold">{format(day, 'dd')}</span>
                  </button>
                ))}
              </div>
            </div>

            {date && (
              <TimeSlotGrid
                slots={availableSlots}
                selected={
                  availableSlots.find((slot) => format(new Date(slot.dateTime), 'HH:mm') === time)?.dateTime
                }
                onSelect={(value) => setTime(format(new Date(value), 'HH:mm'))}
                loading={loadingSlots}
              />
            )}

            {!isReschedule && (
              <>
                {date && time && <AppointmentTypePicker value={type} onChange={setType} />}
                <InsuranceFields
                  idPrefix="patient"
                  used={insuranceUsed}
                  provider={insuranceProvider}
                  memberNumber={insuranceMemberNumber}
                  onUsedChange={setInsuranceUsed}
                  onProviderChange={setInsuranceProvider}
                  onMemberNumberChange={setInsuranceMemberNumber}
                />
                <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <p>
                    <strong>Privacidade e LGPD.</strong> Os dados do agendamento são utilizados para organizar
                    e prestar o atendimento, com acesso restrito conforme as regras de proteção de dados.
                  </p>
                </div>
              </>
            )}
            <button
              type="button"
              disabled={
                !clinicId ||
                !date ||
                !time ||
                !availableSlots.some((slot) => format(new Date(slot.dateTime), 'HH:mm') === time) ||
                (insuranceUsed && !insuranceProvider.trim()) ||
                loadingSlots ||
                saving
              }
              onClick={() => void handleConfirm()}
              className="btn btn-primary w-full py-3"
            >
              {saving
                ? isReschedule
                  ? 'Remarcando...'
                  : 'Agendando...'
                : isReschedule
                  ? 'Confirmar remarcação'
                  : 'Confirmar Agendamento'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} strokeWidth={3} />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isReschedule ? 'Consulta remarcada!' : 'Consulta agendada!'}
            </h2>

            <p className="text-slate-500 mb-6">
              {selectedProfessional?.name} — {selectedSpecialty?.name}
            </p>

            <div className="bg-slate-50 rounded-xl p-4 max-w-sm mx-auto text-left mb-8 border border-slate-200">
              <div className="py-2 border-b border-slate-200/60">
                <span className="text-xs text-slate-400 block">Unidade</span>

                <span className="font-semibold text-slate-900">{selectedClinic?.name}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200/60">
                <span className="text-slate-500">Data</span>

                <span className="font-semibold text-slate-900">
                  {date
                    ? format(date, "dd 'de' MMMM", {
                        locale: ptBR,
                      })
                    : ''}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-200/60">
                <span className="text-slate-500">Horário</span>

                <span className="font-semibold text-slate-900">{time}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-500">Modalidade</span>

                <span className="font-semibold text-slate-900">
                  {type === 'TELEMEDICINA' ? 'On-line' : 'Presencial'}
                </span>
              </div>
            </div>

            {type === 'TELEMEDICINA' && teleconsultationUrl && (
              <div className="mx-auto mb-6 max-w-xl rounded-xl border border-brand-200 bg-brand-50 p-4 text-left">
                <p className="font-semibold text-brand-900">Link da teleconsulta</p>
                <p className="mt-1 break-all text-sm text-brand-800">{teleconsultationUrl}</p>
                <a
                  href={teleconsultationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm mt-3"
                >
                  Abrir sala
                </a>
              </div>
            )}
            {!isReschedule && (
              <div className="mb-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate(`/unidade/${clinicId}`)}
                  className="btn btn-primary"
                >
                  Ir para a página inicial da unidade
                </button>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {!isReschedule && (
                <button type="button" onClick={reset} className="btn btn-secondary">
                  Agendar outra
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/patient/appointments')}
                className="btn btn-secondary"
              >
                Ver consultas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
