import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  UserRound,
  Search,
  CheckCircle,
  XCircle,
  Building2,
  FileText,
  Download,
} from 'lucide-react';
import { ApiError, patientApi, type Appointment, type Professional, type Specialty } from '../../lib/api';

export function PatientHistory() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [documentsByAppointment, setDocumentsByAppointment] = useState<
    Record<string, Array<{ id: string; fileName: string; type: string; size: number; createdAt: string }>>
  >({});

  const [professionals, setProfessionals] = useState<Professional[]>([]);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');

        const historyResponse = await patientApi.history();

        const history = historyResponse.data ?? [];

        setAppointments(history);
        const documentEntries = await Promise.all(
          history.map(async (appointment) => {
            try {
              const response = await patientApi.documents(appointment.id);
              return [appointment.id, response.data ?? []] as const;
            } catch {
              return [appointment.id, []] as const;
            }
          }),
        );
        setDocumentsByAppointment(Object.fromEntries(documentEntries));

        /*
         * O histórico pode conter consultas de
         * várias unidades. Descobrimos as unidades
         * presentes nos registros e carregamos seus
         * catálogos.
         */
        const clinicIds = Array.from(
          new Set(
            history
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
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar seu histórico.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filtered = useMemo(
    () =>
      appointments.filter((item) => {
        const professional = professionals.find((value) => value.id === item.professionalId);

        const specialty = specialties.find((value) => value.id === item.specialtyId);

        const text = [
          item.dateTime,
          item.location,
          professional?.name ?? '',
          specialty?.name ?? '',
          item.clinicId ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return text.includes(search.toLowerCase());
      }),
    [appointments, professionals, specialties, search],
  );

  const professionalsById = useMemo(
    () => new Map(professionals.map((item) => [item.id, item])),
    [professionals],
  );

  const specialtiesById = useMemo(() => new Map(specialties.map((item) => [item.id, item])), [specialties]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Histórico</h1>

        <p className="text-slate-500 mt-1">Consultas concluídas e faltas registradas pelo backend.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="patient-history-search" className="block text-sm font-medium text-slate-700 mb-2">
          Pesquisar no histórico
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

          <input
            id="patient-history-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl"
            placeholder="Pesquisar no histórico..."
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {[...filtered]
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
            .map((item) => {
              const professional = professionalsById.get(item.professionalId);

              const specialty = specialtiesById.get(item.specialtyId);

              const done = item.status === 'REALIZADA';

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <UserRound size={20} />
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {professional?.name ?? 'Profissional'}
                        </h3>

                        <p className="text-sm text-slate-500">{specialty?.name ?? 'Especialidade'}</p>

                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={14} />

                            {new Intl.DateTimeFormat('pt-BR').format(new Date(item.dateTime))}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} />

                            {new Intl.DateTimeFormat('pt-BR', {
                              timeStyle: 'short',
                            }).format(new Date(item.dateTime))}
                          </span>
                        </div>

                        {item.clinicId && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                            <Building2 size={13} />

                            <span>Consulta vinculada à unidade selecionada</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        done ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {done ? <CheckCircle size={13} /> : <XCircle size={13} />}

                      {done ? 'Realizada' : 'Falta'}
                    </span>
                  </div>
                  {item.performedAt && (
                    <p className="mt-3 text-xs font-medium text-emerald-700">
                      Atendimento realizado em{' '}
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                        new Date(item.performedAt),
                      )}
                    </p>
                  )}
                  {item.attendance && (
                    <section className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm">
                      <h4 className="font-semibold text-slate-800">Pós-consulta</h4>
                      {item.attendance.diagnosis && (
                        <p>
                          <strong>Diagnóstico:</strong> {item.attendance.diagnosis}
                        </p>
                      )}
                      {item.attendance.notes && (
                        <p>
                          <strong>Observações:</strong> {item.attendance.notes}
                        </p>
                      )}
                      {item.attendance.prescription && (
                        <p>
                          <strong>Prescrição:</strong> {item.attendance.prescription}
                        </p>
                      )}
                      {!item.attendance.diagnosis &&
                        !item.attendance.notes &&
                        !item.attendance.prescription && (
                          <p className="text-slate-500">Não há informações adicionais registradas.</p>
                        )}
                    </section>
                  )}
                  {(documentsByAppointment[item.id] ?? []).length > 0 && (
                    <section className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-800">Documentos e exames</h4>
                      {documentsByAppointment[item.id].map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                            <FileText size={15} />
                            <span className="truncate">{doc.fileName}</span>
                            <span className="text-xs text-slate-400">{doc.type}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => void patientApi.downloadDocument(doc.id, doc.fileName)}
                            className="btn btn-ghost btn-sm shrink-0"
                          >
                            <Download size={14} /> Baixar
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
