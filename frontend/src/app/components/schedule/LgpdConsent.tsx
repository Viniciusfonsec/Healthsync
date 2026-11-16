import { ShieldCheck } from 'lucide-react';

/** Aviso de privacidade e aceite de compartilhamento de dados (obrigatório no agendamento sem login). */
export function LgpdConsent({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
        <div>
          <strong>Privacidade e LGPD.</strong>
          <p className="mt-1">
            Seus dados serão utilizados para registrar, organizar e administrar este agendamento. O acesso é
            restrito às pessoas autorizadas envolvidas no atendimento, conforme a legislação de proteção de
            dados.
          </p>
        </div>
      </div>
      <label
        htmlFor="share-data-consent"
        className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
      >
        <input
          id="share-data-consent"
          type="checkbox"
          checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-800"
        />
        <span>
          <strong>Aceito compartilhar meus dados *</strong>
          <span className="mt-1 block text-sm text-slate-600">
            Autorizo o compartilhamento dos dados necessários com a unidade e o profissional selecionados para
            viabilizar este atendimento.
          </span>
        </span>
      </label>
    </div>
  );
}
