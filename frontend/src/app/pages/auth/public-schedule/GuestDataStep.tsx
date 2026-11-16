import { PrioritySelector } from '../../../components/PrioritySelector';
import { InsuranceFields } from '../../../components/schedule/InsuranceFields';
import { LgpdConsent } from '../../../components/schedule/LgpdConsent';
import type { PatientPriority } from '../../../lib/priorities';
import { digitsOnly, isValidCpf, maskCpf, maskPhone } from '../../../lib/validation';

export type GuestData = {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  priorities: PatientPriority[];
  insuranceUsed: boolean;
  insuranceProvider: string;
  insuranceMemberNumber: string;
  shareDataAccepted: boolean;
};

export const EMPTY_GUEST: GuestData = {
  name: '',
  cpf: '',
  email: '',
  phone: '',
  birthDate: '',
  gender: '',
  priorities: [],
  insuranceUsed: false,
  insuranceProvider: '',
  insuranceMemberNumber: '',
  shareDataAccepted: false,
};

/** Os dados pessoais estão completos e válidos para enviar? */
export function isGuestDataValid(guest: GuestData): boolean {
  return (
    guest.name.trim().length >= 2 &&
    isValidCpf(guest.cpf) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim()) &&
    digitsOnly(guest.phone).length >= 10 &&
    Boolean(guest.birthDate) &&
    Boolean(guest.gender) &&
    (!guest.insuranceUsed || Boolean(guest.insuranceProvider.trim())) &&
    guest.shareDataAccepted
  );
}

const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3';
const label = 'mb-1.5 block text-sm font-medium text-slate-700';

type Props = {
  guest: GuestData;
  onChange: (patch: Partial<GuestData>) => void;
  summary: string;
};

/** Etapa 5 do agendamento sem login: dados do paciente, preferências, convênio e aceite LGPD. */
export function GuestDataStep({ guest, onChange, summary }: Props) {
  const cpfInvalid = digitsOnly(guest.cpf).length === 11 && !isValidCpf(guest.cpf);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Seus dados *</h2>
        <p className="text-sm text-slate-500">Essas informações serão usadas para registrar a consulta.</p>
        <p className="mt-1 text-xs text-slate-500">Campos marcados com * são obrigatórios.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="guest-name" className={label}>
            Nome completo *
          </label>
          <input
            id="guest-name"
            autoComplete="name"
            value={guest.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            className={input}
          />
        </div>
        <div>
          <label htmlFor="guest-cpf" className={label}>
            CPF *
          </label>
          <input
            id="guest-cpf"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            required
            className={input}
            value={guest.cpf}
            onChange={(e) => onChange({ cpf: maskCpf(e.target.value) })}
            aria-invalid={cpfInvalid}
            aria-describedby={cpfInvalid ? 'guest-cpf-error' : undefined}
          />
          {cpfInvalid && (
            <p id="guest-cpf-error" className="mt-1 text-xs text-red-600">
              CPF inválido. Confira os dígitos informados.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="guest-phone" className={label}>
            Telefone *
          </label>
          <input
            id="guest-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            required
            className={input}
            value={guest.phone}
            onChange={(e) => onChange({ phone: maskPhone(e.target.value) })}
            aria-invalid={Boolean(guest.phone) && digitsOnly(guest.phone).length < 10}
          />
        </div>
        <div>
          <label htmlFor="guest-email" className={label}>
            E-mail *
          </label>
          <input
            id="guest-email"
            type="email"
            autoComplete="email"
            required
            className={input}
            value={guest.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="guest-birth" className={label}>
            Data de nascimento *
          </label>
          <input
            id="guest-birth"
            type="date"
            required
            className={input}
            value={guest.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="guest-gender" className={label}>
            Sexo/gênero *
          </label>
          <select
            id="guest-gender"
            required
            className={input}
            value={guest.gender}
            onChange={(e) => onChange({ gender: e.target.value })}
          >
            <option value="">Selecione</option>
            <option>Feminino</option>
            <option>Masculino</option>
            <option>Outro</option>
            <option>Prefiro não informar</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <PrioritySelector
            value={guest.priorities}
            onChange={(priorities) => onChange({ priorities })}
            idPrefix="guest-priority"
          />
        </div>
        <div className="sm:col-span-2">
          <InsuranceFields
            idPrefix="guest"
            used={guest.insuranceUsed}
            provider={guest.insuranceProvider}
            memberNumber={guest.insuranceMemberNumber}
            onUsedChange={(insuranceUsed) => onChange({ insuranceUsed })}
            onProviderChange={(insuranceProvider) => onChange({ insuranceProvider })}
            onMemberNumberChange={(insuranceMemberNumber) => onChange({ insuranceMemberNumber })}
          />
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <strong>Resumo:</strong> {summary}
      </div>
      <LgpdConsent
        accepted={guest.shareDataAccepted}
        onChange={(shareDataAccepted) => onChange({ shareDataAccepted })}
      />
    </div>
  );
}
