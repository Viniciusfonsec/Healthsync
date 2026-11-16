import { useErrorToast } from '../../lib/notify';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { ApiError, publicApi, type Clinic } from '../../lib/api';

export function HomePage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .clinics()
      .then(({ data }) => {
        if (!cancelled) setClinics((data ?? []).filter((clinic) => clinic.active));
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as unidades agora.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClinics = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return clinics;
    return clinics.filter((clinic) => {
      const address = clinic.address
        ? [clinic.address.street, clinic.address.neighborhood, clinic.address.city, clinic.address.state]
            .filter(Boolean)
            .join(' ')
        : '';
      return `${clinic.name} ${address}`.toLocaleLowerCase('pt-BR').includes(term);
    });
  }, [clinics, query]);

  const openBooking = (clinicId?: string) => {
    navigate(clinicId ? `/agendamento?clinicId=${encodeURIComponent(clinicId)}` : '/agendamento');
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="HealthSync - página inicial">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-white">
              <Activity size={23} />
            </span>
            <span>
              <span className="block text-xl font-bold tracking-tight text-slate-900">HealthSync</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Cuidado conectado
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#servicos" className="transition hover:text-brand-800">
              Nossos serviços
            </a>
            <a href="#unidades" className="transition hover:text-brand-800">
              Unidades
            </a>
            <a href="#como-funciona" className="transition hover:text-brand-800">
              Como funciona
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="btn btn-secondary hidden sm:inline-flex">
              Entrar
            </Link>
            <button
              type="button"
              onClick={() => openBooking()}
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Agendar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-brand-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.12em] text-brand-500">
              Agendamento de consultas
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-brand-700 sm:text-5xl">
              Sua saúde merece um cuidado simples e acessível.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Encontre profissionais, consulte os horários disponíveis e escolha a unidade ou o formato de
              atendimento que funciona para você.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openBooking()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-5 py-3.5 font-semibold text-white transition hover:bg-brand-700"
              >
                Agendar consulta <ArrowRight size={17} />
              </button>
              <a
                href="#unidades"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3.5 font-semibold text-brand-600 transition hover:bg-slate-50"
              >
                Conhecer unidades
              </a>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Você pode iniciar um agendamento sem criar uma conta.
            </p>
          </div>

          <aside className="border-l-2 border-brand-200 pl-6 sm:pl-8">
            <h2 className="text-xl font-semibold text-brand-700">Como podemos ajudar?</h2>
            <p className="mt-2 max-w-md leading-7 text-slate-600">
              Escolha uma opção para seguir diretamente para o serviço desejado.
            </p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => openBooking()}
                className="group flex w-full items-center justify-between gap-4 py-4 text-left rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="flex items-start gap-3">
                  <CalendarCheck size={21} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>
                    <span className="block font-semibold text-slate-800">Agendar uma consulta</span>
                    <span className="mt-1 block text-sm text-slate-500">Unidade, profissional e horário</span>
                  </span>
                </span>
                <span className="btn btn-ghost btn-sm shrink-0" aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              </button>
              <a
                href="#unidades"
                className="group flex items-center justify-between gap-4 py-4 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="flex items-start gap-3">
                  <MapPin size={21} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>
                    <span className="block font-semibold text-slate-800">Encontrar uma unidade</span>
                    <span className="mt-1 block text-sm text-slate-500">Consulte os locais disponíveis</span>
                  </span>
                </span>
                <span className="btn btn-ghost btn-sm shrink-0" aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              </a>
              <Link
                to="/login"
                className="group flex items-center justify-between gap-4 py-4 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="flex items-start gap-3">
                  <Activity size={21} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>
                    <span className="block font-semibold text-slate-800">Acessar minha conta</span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Consulte suas consultas e informações
                    </span>
                  </span>
                </span>
                <span className="btn btn-ghost btn-sm shrink-0" aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={15} className="text-brand-500" /> Seus dados são tratados conforme as regras
              de privacidade aplicáveis.
            </p>
          </aside>
        </div>
      </section>

      <section id="servicos" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-500">Serviços</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-700">
              Tudo para organizar seu atendimento.
            </h2>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            <div className="flex gap-4 py-5">
              <CalendarCheck className="mt-1 shrink-0 text-brand-500" size={23} />
              <div>
                <h3 className="font-semibold text-slate-900">Agendamento on-line</h3>
                <p className="mt-1 leading-6 text-slate-600">
                  Consulte os horários disponíveis e escolha o profissional e a unidade de atendimento.
                </p>
              </div>
            </div>
            <div className="flex gap-4 py-5">
              <Clock3 className="mt-1 shrink-0 text-brand-500" size={23} />
              <div>
                <h3 className="font-semibold text-slate-900">Acompanhamento de consultas</h3>
                <p className="mt-1 leading-6 text-slate-600">
                  Entre na sua conta para consultar os agendamentos e acompanhar atualizações.
                </p>
                <Link to="/login" className="btn btn-ghost btn-sm mt-3">
                  Acessar minha conta <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="flex gap-4 py-5">
              <Video className="mt-1 shrink-0 text-brand-500" size={23} />
              <div>
                <h3 className="font-semibold text-slate-900">Atendimento presencial ou on-line</h3>
                <p className="mt-1 leading-6 text-slate-600">
                  O formato depende da disponibilidade do profissional e da unidade escolhida.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="unidades" className="border-y border-slate-200 bg-brand-50 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-800">Nossa rede</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Encontre uma unidade</h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                Selecione a unidade para ver as opções de atendimento disponíveis.
              </p>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar unidade"
                placeholder="Buscar por nome ou cidade"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          {error && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {error}
            </div>
          )}
          {loading ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Carregando unidades...
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <MapPin className="mx-auto text-slate-300" size={28} />
              <p className="mt-2 font-semibold text-slate-800">Nenhuma unidade encontrada</p>
              <p className="mt-1 text-sm text-slate-500">
                Tente outra busca ou acesse o agendamento completo.
              </p>
              <button type="button" onClick={() => openBooking()} className="btn btn-primary btn-sm mt-4">
                Ir para agendamento
              </button>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredClinics.map((clinic) => {
                const address = clinic.address
                  ? [clinic.address.city, clinic.address.state].filter(Boolean).join(' / ')
                  : '';
                return (
                  <article
                    key={clinic.id}
                    className="flex flex-col border border-slate-200 bg-white p-5 transition hover:border-brand-300"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-600">
                        <MapPin size={21} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900">{clinic.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {address || 'Informações de endereço disponíveis durante o agendamento'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <Link to={`/unidade/${clinic.id}`} className="btn btn-secondary btn-sm">
                        Ver unidade
                      </Link>
                      <button
                        type="button"
                        onClick={() => openBooking(clinic.id)}
                        className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Agendar <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-5 border-y border-slate-200 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-brand-700">Precisa marcar uma consulta?</h2>
            <p className="mt-2 max-w-2xl leading-7 text-slate-600">
              Consulte as opções disponíveis e escolha o melhor horário para você.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openBooking()}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 md:self-center"
          >
            Agendar consulta <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-slate-700">
            <Activity size={17} className="text-brand-800" /> HealthSync
          </Link>
          <p>Plataforma de agendamento e acompanhamento de atendimentos.</p>
          <Link to="/login" className="btn btn-ghost btn-sm">
            Acessar minha conta
          </Link>
        </div>
      </footer>
    </main>
  );
}
