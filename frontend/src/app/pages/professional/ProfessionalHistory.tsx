import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Search, CheckCircle2, FileText, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError, professionalApi, type Appointment } from '../../lib/api';

export function ProfessionalHistory() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);
  const [documents, setDocuments] = useState<
    Record<string, Array<{ id: string; fileName: string; type: string; size: number; createdAt: string }>>
  >({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const response = await professionalApi.history();
        if (!active) return;
        const rows = response.data ?? [];
        setAppointments(rows);
        const docEntries = await Promise.all(
          rows.map(async (item) => {
            try {
              const result = await professionalApi.documents(item.id);
              return [item.id, result.data ?? []] as const;
            } catch {
              return [item.id, []] as const;
            }
          }),
        );
        if (active) setDocuments(Object.fromEntries(docEntries));
      } catch (err) {
        if (active)
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o histórico.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user?.clinicId]);

  const filtered = useMemo(
    () =>
      appointments.filter((a) =>
        `${a.patient?.name ?? ''} ${a.patientId} ${a.status} ${a.location} ${a.attendance?.diagnosis ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [appointments, search],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Histórico Profissional</h1>
        <p className="text-slate-500 mt-1">
          Atendimentos vinculados à sua agenda, inclusive os realizados antes da data originalmente marcada.
        </p>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <label className="sr-only" htmlFor="professional-history-search">
          Pesquisar histórico profissional
        </label>
        <input
          id="professional-history-search"
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por paciente, diagnóstico ou status..."
        />
      </div>
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
          Carregando...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <article key={a.id} className="p-5 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {a.patient?.name || `Paciente #${a.patientId}`}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={14} />
                        Agendada: {new Intl.DateTimeFormat('pt-BR').format(new Date(a.dateTime))}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} />{' '}
                        {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(
                          new Date(a.dateTime),
                        )}
                      </span>
                    </div>
                    {a.performedAt && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Realizada em:{' '}
                        {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
                          new Date(a.performedAt),
                        )}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${a.status === 'REALIZADA' ? 'bg-brand-50 text-brand-700' : a.status === 'CANCELADA' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {a.status === 'REALIZADA' && <CheckCircle2 size={13} />} {a.status}
                  </span>
                </div>
                {a.attendance && (
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                    <h3 className="font-semibold text-slate-800">Pós-consulta</h3>
                    {a.attendance.diagnosis && (
                      <p>
                        <strong>Diagnóstico:</strong> {a.attendance.diagnosis}
                      </p>
                    )}
                    {a.attendance.notes && (
                      <p>
                        <strong>Observações:</strong> {a.attendance.notes}
                      </p>
                    )}
                    {a.attendance.prescription && (
                      <p>
                        <strong>Prescrição:</strong> {a.attendance.prescription}
                      </p>
                    )}
                    {!a.attendance.diagnosis && !a.attendance.notes && !a.attendance.prescription && (
                      <p className="text-slate-500">Sem informações adicionais registradas.</p>
                    )}
                  </div>
                )}
                {(documents[a.id] ?? []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-800">Documentos e exames</h3>
                    {documents[a.id].map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                          <FileText size={15} />
                          <span className="truncate">{doc.fileName}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => void professionalApi.downloadDocument(doc.id, doc.fileName)}
                          className="btn btn-ghost btn-sm shrink-0"
                        >
                          <Download size={14} /> Baixar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-slate-500">Nenhum registro encontrado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
