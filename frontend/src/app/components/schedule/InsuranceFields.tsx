type Props = {
  idPrefix: string;
  used: boolean;
  provider: string;
  memberNumber: string;
  onUsedChange: (used: boolean) => void;
  onProviderChange: (value: string) => void;
  onMemberNumberChange: (value: string) => void;
};

/** Convênio do atendimento (agendamento com e sem login). A operadora é obrigatória quando marcado. */
export function InsuranceFields({
  idPrefix,
  used,
  provider,
  memberNumber,
  onUsedChange,
  onProviderChange,
  onMemberNumberChange,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={used}
          onChange={(event) => onUsedChange(event.target.checked)}
          className="h-4 w-4 accent-brand-800"
        />
        Vou utilizar convênio neste atendimento
      </label>
      {used && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-insurance-provider`} className="mb-1 block text-sm text-slate-700">
              Operadora do convênio *
            </label>
            <input
              id={`${idPrefix}-insurance-provider`}
              value={provider}
              onChange={(event) => onProviderChange(event.target.value)}
              required
              placeholder="Nome do convênio"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-insurance-number`} className="mb-1 block text-sm text-slate-700">
              Número da carteirinha
            </label>
            <input
              id={`${idPrefix}-insurance-number`}
              value={memberNumber}
              onChange={(event) => onMemberNumberChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            />
          </div>
        </div>
      )}
    </div>
  );
}
