import { formatDateTimeShort } from '../../lib/format';
import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { adminApi, ApiError } from '../../lib/api';

interface ProductivityRow {
  professionalId: string;
  professionalName: string;
  totalAttendances: number;
  finished: number;
}

function monthRange(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
}

export function AdminReports() {
  const today = new Date();
  const initial = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(initial);
  const [rows, setRows] = useState<ProductivityRow[]>([]);
  const [absences, setAbsences] = useState<
    { id: string; dateTime: string; patientId: string; professionalId: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const range = monthRange(month);
        const [productivity, absenceData] = await Promise.all([
          adminApi.productivity(range.from, range.to),
          adminApi.absences(range.from, range.to),
        ]);
        setRows(productivity.data as ProductivityRow[]);
        setAbsences(absenceData.data as typeof absences);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os relatórios.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [month]);

  const totals = useMemo(
    () => ({
      attendances: rows.reduce((sum, row) => sum + row.totalAttendances, 0),
      finished: rows.reduce((sum, row) => sum + row.finished, 0),
    }),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-500 mt-1">Produtividade e faltas consultadas diretamente na API.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <FileText size={16} className="text-slate-400" />
          <label className="text-sm font-medium text-slate-700" htmlFor="admin-report-month">
            Mês
          </label>
          <input
            id="admin-report-month"
            aria-label="Mês do relatório"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm outline-none"
          />
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex justify-center text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Atendimentos</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{totals.attendances}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Finalizados</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{totals.finished}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-slate-500">Faltas</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{absences.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Produtividade por profissional</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Profissional</th>
                      <th className="px-5 py-3">Total</th>
                      <th className="px-5 py-3">Finalizados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.professionalId}>
                        <td className="px-5 py-4 text-sm font-medium text-slate-800">
                          {row.professionalName}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{row.totalAttendances}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{row.finished}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Faltas no período</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {absences.length === 0 ? (
                  <div className="p-8 text-sm text-slate-400">Nenhuma falta registrada no período.</div>
                ) : (
                  absences.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Consulta sem comparecimento</p>
                        <p className="text-xs text-slate-500">
                          Paciente e profissional preservados no registro de auditoria.
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">{formatDateTimeShort(item.dateTime)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
