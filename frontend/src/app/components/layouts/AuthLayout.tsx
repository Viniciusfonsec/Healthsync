import { Outlet, useLocation } from 'react-router';
import { Activity } from 'lucide-react';

export function AuthLayout() {
  const { pathname } = useLocation();
  const isWidePage = pathname === '/agendamento' || pathname.startsWith('/unidade/');

  return (
    <div
      className={
        isWidePage
          ? 'min-h-screen bg-slate-50 flex flex-col items-center p-4 pt-6'
          : 'min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4'
      }
    >
      <div className={`mb-8 flex items-center gap-2 ${isWidePage ? 'w-full max-w-6xl' : ''}`}>
        <div className="bg-primary text-white p-2 rounded-xl shadow-sm">
          <Activity size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">HealthSync</h1>
      </div>
      <div
        className={
          isWidePage
            ? 'w-full max-w-6xl'
            : 'w-full max-w-md bg-white rounded-[12px] shadow-sm border border-slate-100 p-8'
        }
      >
        <Outlet />
      </div>
    </div>
  );
}
