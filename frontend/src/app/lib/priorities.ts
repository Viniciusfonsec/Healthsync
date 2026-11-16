export type PatientPriority = 'IDOSO' | 'GESTANTE' | 'PESSOA_COM_DEFICIENCIA';

export const PRIORITY_OPTIONS: ReadonlyArray<{ value: PatientPriority; label: string; hint: string }> = [
  { value: 'IDOSO', label: 'Idoso', hint: '60 anos ou mais' },
  { value: 'GESTANTE', label: 'Gestante', hint: 'Inclui lactantes e pessoas com bebê de colo' },
  {
    value: 'PESSOA_COM_DEFICIENCIA',
    label: 'Pessoa com deficiência',
    hint: 'Física, sensorial, intelectual ou mental',
  },
];

export const PRIORITY_LABELS: Record<PatientPriority, string> = {
  IDOSO: 'Idoso',
  GESTANTE: 'Gestante',
  PESSOA_COM_DEFICIENCIA: 'Pessoa com deficiência',
};

export function ageFromBirthDate(birthDate?: string | null, today: Date = new Date()): number | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = today.getFullYear() - year;
  const hadBirthday =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

/** Preferências cadastradas + "Idoso" automático para quem tem 60 anos ou mais. */
export function effectivePriorities(
  patient?: {
    priorities?: PatientPriority[] | null;
    birthDate?: string | null;
  },
  today: Date = new Date(),
): PatientPriority[] {
  const result = new Set<PatientPriority>(patient?.priorities ?? []);
  const age = ageFromBirthDate(patient?.birthDate, today);
  if (age !== null && age >= 60) result.add('IDOSO');
  return PRIORITY_OPTIONS.map((option) => option.value).filter((value) => result.has(value));
}

export function togglePriority(current: PatientPriority[], value: PatientPriority): PatientPriority[] {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}
