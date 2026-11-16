import { useErrorToast } from '../../lib/notify';
import { useEffect, useState } from 'react';
import { CalendarDays, Save, Clock3, CheckCircle2 } from 'lucide-react';
import { ApiError, professionalApi, me as meRequest, type Professional } from '../../lib/api';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  active: boolean;
}

function defaultSlots(duration: number): Slot[] {
  return DAYS.map((_, index) => ({
    dayOfWeek: index + 1,
    startTime: '08:00',
    endTime: '17:00',
    durationMinutes: duration,
    active: index < 5,
  }));
}

export function ProfessionalSettings() {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [duration, setDuration] = useState(30);
  const [slots, setSlots] = useState<Slot[]>(defaultSlots(30));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    async function load() {
      try {
        const [user, availabilityResponse] = await Promise.all([meRequest(), professionalApi.availability()]);
        const profile = user.profile as Professional;
        const loadedDuration = profile?.consultationDurationMinutes ?? 30;

        setProfessional(profile);
        setDuration(loadedDuration);

        const savedSlots = availabilityResponse.data;
        if (savedSlots.length > 0) {
          const savedByDay = new Map(savedSlots.map((slot) => [slot.dayOfWeek, slot]));
          setSlots(
            DAYS.map((_, index) => {
              const saved = savedByDay.get(index + 1);
              return saved
                ? { ...saved, active: saved.active }
                : {
                    dayOfWeek: index + 1,
                    startTime: '08:00',
                    endTime: '17:00',
                    durationMinutes: loadedDuration,
                    active: false,
                  };
            }),
          );
        } else {
          setSlots(defaultSlots(loadedDuration));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as configurações.');
      }
    }

    void load();
  }, []);

  function patchSlot(index: number, key: keyof Slot, value: string | boolean | number) {
    setSlots((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  }

  async function save() {
    if (duration < 5 || duration > 240) {
      setError('A duração deve estar entre 5 e 240 minutos.');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const activeSlots = slots
        .filter((slot) => slot.active)
        .map(({ active: _active, ...slot }) => ({
          ...slot,
          durationMinutes: duration,
        }));

      await professionalApi.saveAvailability(activeSlots);
      await professionalApi.duration(duration);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Disponibilidade e duração das consultas.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 inline-flex items-center gap-2">
          <CheckCircle2 size={16} />
          Configurações salvas com sucesso.
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 className="font-semibold">Disponibilidade semanal</h2>
            <p className="text-xs text-slate-500">{professional?.name ?? 'Profissional'}</p>
          </div>
        </div>

        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div
              key={slot.dayOfWeek}
              className="grid grid-cols-1 sm:grid-cols-[160px_1fr_1fr_80px] gap-3 items-end p-3 rounded-xl border border-slate-100"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 h-10">
                <input
                  type="checkbox"
                  checked={slot.active}
                  onChange={(event) => patchSlot(index, 'active', event.target.checked)}
                />
                {DAYS[index]}
              </label>

              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Horário de início</span>
                <input
                  aria-label={`Horário de início - ${DAYS[index]}`}
                  type="time"
                  disabled={!slot.active}
                  value={slot.startTime}
                  onChange={(event) => patchSlot(index, 'startTime', event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Horário de término</span>
                <input
                  aria-label={`Horário de término - ${DAYS[index]}`}
                  type="time"
                  disabled={!slot.active}
                  value={slot.endTime}
                  onChange={(event) => patchSlot(index, 'endTime', event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
                />
              </label>

              <span className="text-xs text-slate-400 pb-2">{slot.active ? 'Ativo' : 'Folga'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock3 className="text-primary" size={20} />
          <div>
            <h2 className="font-semibold">Duração da consulta</h2>
            <p className="text-xs text-slate-500">Entre 5 e 240 minutos.</p>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            <span>Duração padrão</span>
            <input
              aria-label="Duração padrão da consulta em minutos"
              type="number"
              min={5}
              max={240}
              step={5}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="w-32 rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
          <span className="text-sm text-slate-500 pb-3">minutos</span>
        </div>
      </section>

      <button type="button" disabled={saving} onClick={() => void save()} className="btn btn-primary">
        <Save size={16} />
        {saving ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}
