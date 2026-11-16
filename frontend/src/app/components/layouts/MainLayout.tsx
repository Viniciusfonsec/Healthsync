import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router';
import {
  Activity,
  Calendar,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Bell,
  Menu,
  FileText,
  Clock,
  PieChart,
  ClipboardList,
  User,
  Stethoscope,
  List,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../BackButton';
import { notificationsApi } from '../../lib/api';

interface MainLayoutProps {
  role: 'patient' | 'professional' | 'admin' | 'master';
}

export function MainLayout({ role }: MainLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = `/${location.pathname.split('/')[1] || 'patient'}/dashboard`;
  // O painel inicial não tem para onde voltar; a tela de agendar tem seus próprios botões "Voltar".
  const showBack = !location.pathname.endsWith('/dashboard') && location.pathname !== '/patient/schedule';
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { user, isAuthenticated, logout, switchProfessionalClinic } = useAuth();

  const [switchingClinic, setSwitchingClinic] = useState(false);
  const [clinicSwitchError, setClinicSwitchError] = useState('');

  const navItems = {
    patient: [
      {
        path: '/patient/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        path: '/patient/schedule',
        label: 'Agendar Consulta',
        icon: Calendar,
      },
      {
        path: '/patient/appointments',
        label: 'Minhas Consultas',
        icon: ClipboardList,
      },
      {
        path: '/patient/history',
        label: 'Histórico',
        icon: Clock,
      },
      {
        path: '/patient/notifications',
        label: 'Notificações',
        icon: Bell,
      },
      {
        path: '/patient/profile',
        label: 'Perfil',
        icon: User,
      },
    ],

    professional: [
      {
        path: '/professional/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        path: '/professional/agenda',
        label: 'Agenda',
        icon: Calendar,
      },
      {
        path: '/professional/patients-today',
        label: 'Pacientes do Dia',
        icon: Users,
      },
      {
        path: '/professional/consultation',
        label: 'Atendimento',
        icon: Stethoscope,
      },
      {
        path: '/professional/history',
        label: 'Histórico',
        icon: Clock,
      },
      {
        path: '/professional/notifications',
        label: 'Notificações',
        icon: Bell,
      },
      {
        path: '/professional/settings',
        label: 'Configurações',
        icon: Settings,
      },
    ],

    admin: [
      {
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: PieChart,
      },
      {
        path: '/admin/users',
        label: 'Usuários',
        icon: Users,
      },
      {
        path: '/admin/professionals',
        label: 'Profissionais',
        icon: Stethoscope,
      },
      {
        path: '/admin/specialties',
        label: 'Especialidades',
        icon: Activity,
      },
      {
        path: '/admin/reports',
        label: 'Relatórios',
        icon: FileText,
      },
      {
        path: '/admin/notifications',
        label: 'Notificações',
        icon: Bell,
      },
      {
        path: '/admin/logs',
        label: 'Logs',
        icon: List,
      },
      {
        path: '/admin/settings',
        label: 'Configurações',
        icon: Settings,
      },
    ],

    master: [
      {
        path: '/master/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        path: '/master/clinics',
        label: 'Unidades',
        icon: Building2,
      },
      {
        path: '/master/professionals',
        label: 'Profissionais',
        icon: Users,
      },
      {
        path: '/master/specialties',
        label: 'Especialidades',
        icon: Stethoscope,
      },
      {
        path: '/master/administrators',
        label: 'Administradores',
        icon: ShieldCheck,
      },
      {
        path: '/master/history',
        label: 'Histórico administrativo',
        icon: ClipboardList,
      },
      {
        path: '/master/notifications',
        label: 'Notificações',
        icon: Bell,
      },
    ],
  };

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user) {
      setUnreadNotifications(0);
      return () => {
        cancelled = true;
      };
    }

    const refreshUnread = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await notificationsApi.list();
        if (!cancelled) {
          setUnreadNotifications((response.data ?? []).filter((item) => !item.readAt).length);
        }
      } catch {
        // A falha temporária da central não deve bloquear a navegação do usuário.
      }
    };

    void refreshUnread();
    const intervalId = window.setInterval(() => void refreshUnread(), 30_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshUnread();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, user?.email, location.pathname]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const links = navItems[role];

  const expectedRole =
    role === 'patient'
      ? 'PACIENTE'
      : role === 'professional'
        ? 'PROFISSIONAL'
        : role === 'master'
          ? 'ADMIN_MASTER'
          : 'ADMINISTRADOR';

  /*
   * Normaliza o papel recebido da sessão para string.
   * Isso evita conflito de tipos caso o Role do frontend
   * ainda não esteja sincronizado com o backend.
   */
  const currentRole = String(user.role ?? '');

  if (currentRole !== expectedRole) {
    const destination =
      currentRole === 'PACIENTE'
        ? '/patient/dashboard'
        : currentRole === 'PROFISSIONAL'
          ? '/professional/dashboard'
          : currentRole === 'ADMIN_MASTER'
            ? '/master/dashboard'
            : '/admin/dashboard';

    return <Navigate to={destination} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:block flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-100">
          <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm">
            <Activity size={24} />
          </div>

          <span className="text-xl font-bold text-slate-900">HealthSync</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {links.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
                ${
                  isActive
                    ? 'bg-primary text-white font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {role === 'professional' && user.availableClinics?.length ? (
          <div className="border-t border-slate-100 p-4">
            <label
              htmlFor="sidebar-current-clinic"
              className="mb-1.5 block text-xs font-medium text-slate-500"
            >
              Unidade de trabalho
            </label>
            <select
              id="sidebar-current-clinic"
              value={user.clinicId}
              disabled={switchingClinic}
              onChange={async (event) => {
                const nextClinicId = event.target.value;
                if (nextClinicId === user.clinicId) return;
                setClinicSwitchError('');
                setSwitchingClinic(true);
                try {
                  await switchProfessionalClinic(nextClinicId);
                } catch {
                  setClinicSwitchError('Não foi possível trocar de unidade.');
                } finally {
                  setSwitchingClinic(false);
                }
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Unidade de trabalho atual"
            >
              {user.availableClinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            {clinicSwitchError && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {clinicSwitchError}
              </p>
            )}
          </div>
        ) : null}

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => {
              logout();

              navigate('/login', { replace: true });
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Abrir menu"
              aria-expanded={isSidebarOpen}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-800">{user.name ?? user.email}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/${role}/notifications`)}
              aria-label={
                unreadNotifications > 0
                  ? `Notificações: ${unreadNotifications} não lidas`
                  : 'Abrir notificações'
              }
              title="Notificações"
              className="relative rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>

            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
              {(user.name?.[0] ?? user.email?.[0] ?? role.charAt(0)).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {showBack && <BackButton fallback={dashboardPath} className="mb-4" />}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
