import { useState } from 'react';
import { CalendarPlus, Download, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadAppointmentCalendar, googleCalendarUrl } from '../lib/calendar';
import { notifyError } from '../lib/notify';

type Props = {
  title: string;
  description?: string;
  location?: string;
  start: string;
  durationMinutes: number;
  appointmentId?: number | string;
  /** Quando informado, exibe o botão "Enviar por e-mail". Deve retornar o e-mail (mascarado) de destino. */
  onSendEmail?: () => Promise<{ email?: string } | void>;
  className?: string;
};

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary hover:text-primary disabled:opacity-60';

/**
 * Opções para guardar a consulta fora do sistema:
 * 1) arquivo .ics — abre direto na agenda do iPhone/Android/Outlook;
 * 2) Google Agenda — abre o app/navegador já preenchido;
 * 3) e-mail — recebe o resumo com o convite anexado.
 */
export function AddToCalendarMenu({ onSendEmail, className, ...event }: Props) {
  const [sending, setSending] = useState(false);

  function saveIcs() {
    try {
      downloadAppointmentCalendar(event);
      toast.success('Convite gerado. Abra o arquivo para salvar na agenda do celular.');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Não foi possível gerar o convite da agenda.');
    }
  }

  function openGoogle() {
    try {
      window.open(googleCalendarUrl(event), '_blank', 'noopener,noreferrer');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Não foi possível abrir o Google Agenda.');
    }
  }

  async function sendEmail() {
    if (!onSendEmail) return;
    setSending(true);
    try {
      const result = await onSendEmail();
      const target = result && typeof result === 'object' ? result.email : undefined;
      toast.success(target ? `Enviamos o convite para ${target}.` : 'Convite enviado por e-mail.');
    } catch (err) {
      // Erros HTTP já aparecem em pop-up pela camada de API; aqui cobrimos os demais.
      if (!(err instanceof Error && 'status' in err)) {
        notifyError('Não foi possível enviar o e-mail agora. Tente novamente.');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={`flex flex-wrap gap-2 ${className ?? ''}`}
      role="group"
      aria-label="Salvar consulta na agenda"
    >
      <button type="button" onClick={saveIcs} className={buttonClass}>
        <Download size={15} /> Agenda do celular (.ics)
      </button>
      <button type="button" onClick={openGoogle} className={buttonClass}>
        <CalendarPlus size={15} /> Google Agenda
      </button>
      {onSendEmail && (
        <button type="button" onClick={sendEmail} disabled={sending} className={buttonClass}>
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Enviar por e-mail
        </button>
      )}
    </div>
  );
}
