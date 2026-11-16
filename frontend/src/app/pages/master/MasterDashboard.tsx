import { Link } from 'react-router';
import { ArrowRight, Bell, Building2, ShieldCheck, Stethoscope, ClipboardList, Users } from 'lucide-react';

const cards = [
  {
    title: 'Unidades',
    description: 'Cadastrar, editar, ativar e desativar unidades.',
    path: '/master/clinics',
    icon: Building2,
  },
  {
    title: 'Profissionais',
    description: 'Gerenciar profissionais de todas as unidades.',
    path: '/master/professionals',
    icon: Users,
  },
  {
    title: 'Especialidades',
    description: 'Gerenciar especialidades por unidade.',
    path: '/master/specialties',
    icon: Stethoscope,
  },
  {
    title: 'Administradores',
    description: 'Gerenciar administradores de cada unidade.',
    path: '/master/administrators',
    icon: ShieldCheck,
  },
  {
    title: 'Histórico administrativo',
    description: 'Consultar ações administrativas realizadas na plataforma.',
    path: '/master/history',
    icon: ClipboardList,
  },
  {
    title: 'Notificações',
    description: 'Consultar avisos administrativos da rede.',
    path: '/master/notifications',
    icon: Bell,
  },
];

export function MasterDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Master</h1>

        <p className="mt-1 text-slate-500">Administração global da plataforma HealthSync.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.title}
              to={card.path}
              className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={21} />
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary"
                />
              </div>

              <h2 className="font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{card.description}</p>
              <span className="card-action mt-5">
                Acessar módulo <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-semibold text-slate-900">Escopo global</h2>

        <p className="text-sm text-slate-500 mt-2">
          O Admin Master possui acesso administrativo global, enquanto os administradores comuns continuam
          limitados à unidade vinculada ao usuário.
        </p>
      </div>
    </div>
  );
}
