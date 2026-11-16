import { formatDateTimeShort } from '../../lib/format';
import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { masterApi, ApiError } from '../../lib/api';

interface AuditLog {
  id: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  actorUserId?: string;
  createdAt?: string;
}

export function MasterHistory() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useErrorToast(error);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    masterApi
      .auditLogs()
      .then((response) => {
        if (active) setLogs(response.data as AuditLog[]);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof ApiError ? err.message : 'Não foi possível carregar o histórico administrativo.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((log) =>
        `${log.action ?? ''} ${log.resource ?? ''}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [logs, search],
  );

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList size={21} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Histórico administrativo</h1>
            <p className="mt-1 text-sm text-slate-500">
              Registro de ações administrativas da plataforma, separado dos históricos clínicos.
            </p>
          </div>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Pesquisar histórico administrativo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar ação ou recurso..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4"
        />
      </div>
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Carregando histórico...
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {filtered.map((log) => (
            <div key={log.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-slate-900">{log.action ?? 'Ação registrada'}</strong>
                <span className="text-xs text-slate-500">
                  {log.createdAt ? formatDateTimeShort(log.createdAt) : '—'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Recurso: {log.resource ?? '—'}
                {log.resourceId ? ` · Registro ${log.resourceId}` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Responsável: {log.actorUserId ? `Usuário ${log.actorUserId}` : 'Não identificado'}
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-500">Nenhuma ação administrativa encontrada.</div>
          )}
        </div>
      )}
    </div>
  );
}
