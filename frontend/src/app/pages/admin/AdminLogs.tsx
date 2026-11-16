import { formatDateTimeShort } from '../../lib/format';
import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
import { adminApi, ApiError } from '../../lib/api';

interface AuditLog {
  id: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  actorUserId?: string;
  createdAt?: string;
}

export function AdminLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    async function load() {
      try {
        setLogs((await adminApi.auditLogs()).data as AuditLog[]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os logs.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const q = search.toLowerCase();
        return !q || `${log.action ?? ''} ${log.resource ?? ''}`.toLowerCase().includes(q);
      }),
    [logs, search],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Logs do sistema</h1>
        <p className="text-slate-500 mt-1">Auditoria registrada pelo backend.</p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <label htmlFor="admin-logs-search" className="block text-sm font-medium text-slate-700 mb-2">
          Pesquisar logs
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="admin-logs-search"
            aria-label="Pesquisar logs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar ação, recurso ou usuário…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none"
          />
        </div>
      </div>
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex justify-center text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando…
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full p-5 flex items-center justify-between gap-4 text-left"
              >
                <div>
                  <p className="font-medium text-slate-900">{log.action ?? 'Ação registrada'}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {log.resource ?? '—'} · {log.createdAt ? formatDateTimeShort(log.createdAt) : '—'}
                  </p>
                </div>
                {expanded === log.id ? (
                  <ChevronUp size={18} className="text-slate-400" />
                ) : (
                  <ChevronDown size={18} className="text-slate-400" />
                )}
              </button>
              {expanded === log.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400">Responsável</span>
                    <p className="text-slate-600">Usuário autenticado</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Registro</span>
                    <p className="text-slate-600">Identificador preservado apenas no banco de auditoria</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
              Nenhum log encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
