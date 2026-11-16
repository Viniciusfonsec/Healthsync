import { formatDateTimeShort } from '../../lib/format';
import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Play, Square, User, Clock, FileText, Upload, Download } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { endOfDay, startOfDay } from 'date-fns';
import { ApiError, professionalApi, type Appointment, type Attendance } from '../../lib/api';

function formatAppointmentDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value?: string | null) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ProfessionalConsultation() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const appointmentIdFromUrl = searchParams.get('appointmentId') ?? '';

  const dateFromUrl = searchParams.get('date') ?? '';

  const targetDate = useMemo(() => {
    if (dateFromUrl) {
      const parsed = new Date(`${dateFromUrl}T12:00:00`);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    if (appointmentIdFromUrl) {
      return new Date();
    }

    return new Date();
  }, [dateFromUrl, appointmentIdFromUrl]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [selectedId, setSelectedId] = useState(appointmentIdFromUrl);

  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      fileName: string;
      type: 'EXAME' | 'DOCUMENTO' | 'PRESCRICAO' | 'OUTRO';
      mimeType: string;
      size: number;
      createdAt: string;
    }>
  >([]);
  const [documentType, setDocumentType] = useState<'EXAME' | 'DOCUMENTO' | 'PRESCRICAO' | 'OUTRO'>(
    'DOCUMENTO',
  );

  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    setSelectedId(appointmentIdFromUrl);
    setAttendance(null);
    setDocuments([]);
    setError('');
  }, [appointmentIdFromUrl, user?.clinicId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await professionalApi.agenda(startOfDay(targetDate), endOfDay(targetDate));
        let data = (response.data ?? []).map((item) => ({ ...item, id: String(item.id) }));
        if (appointmentIdFromUrl) {
          try {
            const rawAppointment = await professionalApi.appointment(appointmentIdFromUrl);
            const selectedAppointment = { ...rawAppointment, id: String(rawAppointment.id) };
            data = [
              selectedAppointment,
              ...data.filter((item) => String(item.id) !== selectedAppointment.id),
            ];
            if (selectedAppointment.attendance) {
              setAttendance(selectedAppointment.attendance);
              setNotes(selectedAppointment.attendance.notes ?? '');
              setDiagnosis(selectedAppointment.attendance.diagnosis ?? '');
              setPrescription(selectedAppointment.attendance.prescription ?? '');
            }
          } catch (err) {
            setError(
              err instanceof ApiError ? err.message : 'Não foi possível localizar a consulta selecionada.',
            );
          }
        }
        setAppointments(data);

        if (appointmentIdFromUrl && data.some((appointment) => appointment.id === appointmentIdFromUrl)) {
          setSelectedId(appointmentIdFromUrl);
        } else if (!appointmentIdFromUrl) {
          const firstAppointment = data.find((appointment) =>
            ['AGENDADA', 'CONFIRMADA'].includes(appointment.status),
          );

          if (firstAppointment) {
            setSelectedId(firstAppointment.id);
          }
        }
      } catch (err) {
        setAppointments([]);

        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os atendimentos.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [targetDate, appointmentIdFromUrl, user?.clinicId]);

  const appointment = useMemo(
    () => appointments.find((item) => item.id === selectedId),
    [appointments, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setDocuments([]);
      return;
    }

    void professionalApi
      .documents(selectedId)
      .then((response) => setDocuments(response.data ?? []))
      .catch(() => setDocuments([]));
  }, [selectedId]);

  async function uploadDocument(file: File) {
    if (!selectedId) return;

    setSaving(true);
    setError('');

    try {
      const result = await professionalApi.uploadDocument(selectedId, file, documentType);
      setDocuments((current) => [result.document, ...current]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível anexar o documento.');
    } finally {
      setSaving(false);
    }
  }

  async function start() {
    if (!selectedId) return;

    setSaving(true);
    setError('');

    try {
      const result = await professionalApi.startAttendance(selectedId, {
        notes,
        diagnosis,
        prescription,
      });

      setAttendance(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível iniciar o atendimento.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO') {
    if (!attendance) return;

    setSaving(true);
    setError('');

    try {
      const result = await professionalApi.updateAttendanceStatus(attendance.id, status);

      setAttendance(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o atendimento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Atendimento</h1>

        <p className="text-slate-500 mt-1">Inicie e acompanhe o ciclo do atendimento.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label
          htmlFor="professional-consultation-appointment"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Consulta
        </label>

        <select
          id="professional-consultation-appointment"
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value);
            setAttendance(null);
            setDocuments([]);
            setError('');
          }}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
        >
          <option value="">Selecione...</option>

          {appointments
            .filter((item) => ['AGENDADA', 'CONFIRMADA'].includes(item.status))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {formatAppointmentDate(item.dateTime)} · consulta {item.status.toLowerCase()}
              </option>
            ))}
        </select>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
          Carregando atendimento...
        </div>
      )}

      {!loading && !appointment && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <FileText size={16} />
            Nenhuma consulta disponível para esta data.
          </div>
        </div>
      )}

      {!loading && appointment && (
        <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <User size={24} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">Paciente agendado</h2>

                <p className="text-sm text-slate-500 inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatAppointmentDate(appointment.dateTime)}
                  {' · '}
                  {appointment.durationMinutes} min
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="text-sm text-slate-600">
                Observações
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={Boolean(attendance)}
                  className="mt-1 w-full min-h-28 rounded-xl border border-slate-200 p-3 disabled:bg-slate-50"
                  placeholder="Registre as observações da consulta..."
                />
              </label>

              <label className="text-sm text-slate-600">
                Diagnóstico
                <input
                  value={diagnosis}
                  onChange={(event) => setDiagnosis(event.target.value)}
                  disabled={Boolean(attendance)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-50"
                  placeholder="Informe o diagnóstico..."
                />
              </label>

              <label className="text-sm text-slate-600">
                Prescrição
                <textarea
                  value={prescription}
                  onChange={(event) => setPrescription(event.target.value)}
                  disabled={Boolean(attendance)}
                  className="mt-1 w-full min-h-24 rounded-xl border border-slate-200 p-3 disabled:bg-slate-50"
                  placeholder="Informe a prescrição..."
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void start()}
              disabled={saving || Boolean(attendance)}
              className="btn btn-primary mt-5"
            >
              <Play size={15} />

              {attendance ? 'Atendimento iniciado' : 'Iniciar atendimento'}
            </button>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Documentos e exames</h3>
                  <p className="mt-1 text-sm text-slate-500">PDF, JPG ou PNG de até 10 MB.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    <span>Tipo do documento</span>
                    <select
                      value={documentType}
                      onChange={(event) => setDocumentType(event.target.value as typeof documentType)}
                      disabled={!attendance || saving}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                    >
                      <option value="DOCUMENTO">Documento</option>
                      <option value="EXAME">Exame</option>
                      <option value="PRESCRICAO">Prescrição</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </label>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    <Upload size={16} />
                    Anexar arquivo
                    <input
                      type="file"
                      className="sr-only"
                      accept="application/pdf,image/jpeg,image/png"
                      disabled={!attendance || saving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadDocument(file);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {!attendance && (
                <p className="mt-3 text-sm text-slate-500">Inicie o atendimento para habilitar anexos.</p>
              )}

              {attendance && documents.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">Nenhum documento anexado a este atendimento.</p>
              )}

              {documents.length > 0 && (
                <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {documents.map((document) => (
                    <div
                      key={`${document.fileName}-${document.createdAt}`}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{document.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {document.type} · {(document.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {formatDateTimeShort(document.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void professionalApi.downloadDocument(document.id, document.fileName)
                          }
                          className="btn btn-ghost btn-sm"
                        >
                          <Download size={14} /> Baixar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Status</h2>

            {attendance ? (
              <>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Status atual</div>

                  <div className="text-xl font-bold text-slate-900 mt-1">{attendance.status}</div>

                  <div className="text-xs text-slate-500 mt-2">
                    Início: {formatTime(attendance.startedAt)}
                  </div>
                </div>

                <div className="grid gap-2 mt-4">
                  <button
                    type="button"
                    disabled={saving || attendance.status !== 'ABERTO'}
                    onClick={() => void updateStatus('EM_ANDAMENTO')}
                    className="btn btn-secondary"
                  >
                    <Play size={15} />
                    Em andamento
                  </button>

                  <button
                    type="button"
                    disabled={saving || attendance.status !== 'EM_ANDAMENTO'}
                    onClick={() => void updateStatus('FINALIZADO')}
                    className="btn btn-success-solid"
                  >
                    <CheckCircle2 size={15} />
                    Finalizar
                  </button>

                  <button
                    type="button"
                    disabled={saving || ['FINALIZADO', 'CANCELADO'].includes(attendance.status)}
                    onClick={() => void updateStatus('CANCELADO')}
                    className="btn btn-danger"
                  >
                    <Square size={14} />
                    Cancelar atendimento
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 inline-flex items-center gap-2">
                <FileText size={16} />
                Preencha as informações e inicie o atendimento.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
