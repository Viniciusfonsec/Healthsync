import { Check, Video } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { AddToCalendarMenu } from '../../../components/AddToCalendarMenu';
import { formatDateTimeLong } from './formatDateTimeLong';

type Props = {
  clinicName?: string;
  specialtyName?: string;
  professionalName?: string;
  dateTime: string;
  durationMinutes: number;
  type: 'PRESENCIAL' | 'TELEMEDICINA';
  insurance: string;
  email: string;
  teleconsultationUrl?: string;
  appointmentId?: string;
};

/** Confirmação do agendamento sem login, com atalhos para salvar na agenda. */
export function PublicScheduleSuccess(props: Props) {
  const navigate = useNavigate();
  const {
    clinicName,
    specialtyName,
    professionalName,
    dateTime,
    durationMinutes,
    type,
    insurance,
    email,
    teleconsultationUrl,
    appointmentId,
  } = props;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check size={32} aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Consulta agendada com sucesso</h1>
        <p className="mt-2 text-slate-500">Confira os dados do seu atendimento:</p>
        <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-5 text-left">
          <div>
            <dt className="inline font-semibold">Unidade: </dt>
            <dd className="inline">{clinicName}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Especialidade: </dt>
            <dd className="inline">{specialtyName}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Profissional: </dt>
            <dd className="inline">{professionalName}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Data e horário: </dt>
            <dd className="inline">{formatDateTimeLong(dateTime)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Convênio: </dt>
            <dd className="inline">{insurance}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Tipo: </dt>
            <dd className="inline">{type === 'PRESENCIAL' ? 'Presencial' : 'Telemedicina'}</dd>
          </div>
        </dl>
        {type === 'TELEMEDICINA' && teleconsultationUrl && (
          <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-left">
            <div className="inline-flex items-center gap-2 font-semibold text-brand-900">
              <Video size={16} aria-hidden="true" /> Link da teleconsulta
            </div>
            <p className="mt-1 break-all text-sm text-brand-800">{teleconsultationUrl}</p>
            <a
              href={teleconsultationUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm mt-3"
            >
              Abrir sala de teleconsulta
            </a>
          </div>
        )}
        <p className="mt-5 text-sm text-slate-500">
          O resumo da consulta, com o convite da agenda, está sendo enviado para <strong>{email}</strong>.
          Você também pode salvá-la agora na agenda do celular.
        </p>
        <div className="mt-6">
          <AddToCalendarMenu
            className="justify-center"
            title={`Consulta - ${professionalName ?? 'HealthSync'}`}
            description={specialtyName ?? 'Atendimento'}
            location={
              type === 'PRESENCIAL' ? (clinicName ?? 'Consultório') : teleconsultationUrl || 'Telemedicina'
            }
            start={dateTime}
            durationMinutes={durationMinutes}
            appointmentId={appointmentId}
          />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate('/')} className="btn btn-primary flex-1">
            Voltar ao início
          </button>
          <Link
            to="/agendamento"
            onClick={() => window.location.reload()}
            className="btn btn-secondary flex-1"
          >
            Novo agendamento
          </Link>
        </div>
      </div>
    </div>
  );
}
