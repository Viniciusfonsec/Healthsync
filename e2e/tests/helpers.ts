import { expect, type Page } from '@playwright/test';

export const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';

export const USERS = {
  paciente: 'joaopedro@email.com',
  profissional: 'carlos.matos@healthsync.local',
  profissionalMultiunidade: 'ana.ribeiro@saudeintegrada.local',
  admin: 'admin@healthsync.local',
  master: 'master@healthsync.local',
};

/** Faz login pela tela, como o usuário faria. */
export async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(PASSWORD);
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  // Profissionais escolhem a unidade de trabalho depois de entrar.
  if (page.url().includes('/select-clinic')) {
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: 'Acessar unidade' }).click();
    await expect(page).toHaveURL(/\/professional\/dashboard/);
  }
}

/** CPF válido e diferente a cada execução. */
export function randomCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (base.every((digit) => digit === base[0])) base[0] = (base[0]! + 1) % 10;
  const digit = (numbers: number[]) => {
    const sum = numbers.reduce((total, n, index) => total + n * (numbers.length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const first = digit(base);
  return [...base, first, digit([...base, first])].join('');
}

/** Próximo dia útil (segunda a sexta) a partir de amanhã, no formato YYYY-MM-DD. */
export function nextWeekday(offsetDays = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
