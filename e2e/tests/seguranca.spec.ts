import { expect, test } from '@playwright/test';
import { login, USERS } from './helpers';

test('a sessão fica num cookie httpOnly: nenhum token ao alcance do JavaScript', async ({ page, context }) => {
  await login(page, USERS.paciente);
  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === 'hs_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Strict');
  const visible = await page.evaluate(() => `${JSON.stringify(localStorage)} ${JSON.stringify(sessionStorage)} ${document.cookie}`);
  expect(visible).not.toMatch(/eyJ[\w-]+\.[\w-]+/); // formato de um JWT
});

test('sair encerra a sessão e protege as páginas internas', async ({ page }) => {
  await login(page, USERS.paciente);
  await page.getByRole('button', { name: /sair/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/patient/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('paciente não acessa área do administrador', async ({ page }) => {
  await login(page, USERS.paciente);
  await page.goto('/admin/dashboard');
  await expect(page).not.toHaveURL(/\/admin\/dashboard/);
});
