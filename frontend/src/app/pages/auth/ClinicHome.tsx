import { useErrorToast } from '../../lib/notify';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Building2, CalendarDays, Clock, Mail, MapPin, Phone, Stethoscope } from 'lucide-react';
import { ApiError, publicApi, type Clinic } from '../../lib/api';

export function ClinicHome() {
  const { clinicId } = useParams();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [error, setError] = useState('');
  useErrorToast(error);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .clinics()
      .then(({ data }) => {
        if (!cancelled) setClinic((data ?? []).find((item) => item.id === clinicId) ?? null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os dados da unidade.');
      });
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-700 px-8 py-12 text-white md:px-12">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Building2 size={28} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-100">
            HealthSync · Unidade de atendimento
          </p>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            {clinic?.name ?? (error ? 'Unidade indisponível' : 'Carregando unidade...')}
          </h1>
          <p className="mt-3 max-w-2xl text-brand-100">Agende e acompanhe seu atendimento em um só lugar.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {clinic && (
              <Link
                to={`/agendamento?clinicId=${clinic.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-brand-900"
              >
                <CalendarDays size={18} /> Agendar consulta
              </Link>
            )}
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              Acessar minha conta
            </Link>
          </div>
        </div>
        <div className="grid gap-5 p-8 md:grid-cols-3 md:p-10">
          <div className="flex gap-3">
            <MapPin className="mt-1 shrink-0 text-brand-700" size={21} />
            <div>
              <h2 className="font-semibold text-slate-900">Endereço</h2>
              <p className="mt-1 text-sm text-slate-600">
                {clinic?.address
                  ? [
                      clinic.address.street,
                      clinic.address.number,
                      clinic.address.neighborhood,
                      clinic.address.city,
                      clinic.address.state,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Endereço não informado'
                  : 'Endereço não informado'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="mt-1 shrink-0 text-brand-700" size={21} />
            <div>
              <h2 className="font-semibold text-slate-900">Telefone</h2>
              <p className="mt-1 text-sm text-slate-600">{clinic?.phone ?? 'Telefone não informado'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="mt-1 shrink-0 text-brand-700" size={21} />
            <div>
              <h2 className="font-semibold text-slate-900">Contato</h2>
              <p className="mt-1 text-sm text-slate-600">{clinic?.email ?? 'E-mail não informado'}</p>
            </div>
          </div>
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Stethoscope size={22} className="mb-3 text-brand-700" />
          <h2 className="font-semibold text-slate-900">Cuidado organizado</h2>
          <p className="mt-2 text-sm text-slate-600">
            Encontre especialidades e profissionais disponíveis para sua necessidade.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Clock size={22} className="mb-3 text-brand-700" />
          <h2 className="font-semibold text-slate-900">Horários disponíveis</h2>
          <p className="mt-2 text-sm text-slate-600">
            Escolha a data e veja os horários liberados na agenda do profissional.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <CalendarDays size={22} className="mb-3 text-brand-700" />
          <h2 className="font-semibold text-slate-900">Acompanhamento</h2>
          <p className="mt-2 text-sm text-slate-600">
            Com uma conta, acompanhe suas consultas, confirmações e histórico.
          </p>
        </div>
      </section>
      <p className="text-center text-xs text-slate-400">
        Esta página apresenta as informações disponíveis no HealthSync. Confirme endereço e funcionamento
        diretamente com a unidade.
      </p>
    </main>
  );
}
