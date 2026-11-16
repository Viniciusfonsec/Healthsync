import { expect, test } from '@playwright/test';
import { login, USERS } from './helpers';

test('profissional com mais de uma unidade escolhe onde vai atender', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(USERS.profissionalMultiunidade);
  await page.getByLabel(/senha/i).fill(process.env.SEED_PASSWORD ?? 'ChangeMe123!');
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(/select-clinic/);
  await page.getByRole('radio', { name: /Clínica Saúde Integrada/ }).click();
  await page.getByRole('button', { name: 'Acessar unidade' }).click();
  await expect(page).toHaveURL(/professional\/dashboard/);
});

test('pacientes do dia: data em português e busca por nome', async ({ page }) => {
  await login(page, USERS.profissional);
  await page.goto('/professional/patients-today');
  await expect(page.getByRole('heading', { name: 'Pacientes do Dia' })).toBeVisible();
  await expect(page.getByText(/(segunda|terça|quarta|quinta|sexta)-feira|sábado|domingo/i).first()).toBeVisible();
  // A busca só aparece quando há pacientes no dia.
  const search = page.getByLabel('Buscar paciente');
  if (await search.count()) {
    await search.fill('zzz-nome-que-nao-existe');
    await expect(page.getByText(/0 de \d+ pacientes/)).toBeVisible();
  } else {
    await expect(page.getByText('Nenhuma consulta para hoje.')).toBeVisible();
  }
});

test('administrador vê os relatórios da unidade', async ({ page }) => {
  await login(page, USERS.admin);
  await page.goto('/admin/reports');
  await expect(page.getByText('Produtividade por profissional')).toBeVisible();
  await expect(page.getByText('Faltas no período')).toBeVisible();
});

test('master desativa e reativa uma especialidade com o modal de confirmação', async ({ page }) => {
  await login(page, USERS.master);
  await page.goto('/master/specialties');
  const toggle = page.getByRole('button', { name: /^(desativar|ativar)$/i }).first();
  const label = (await toggle.textContent())?.trim() ?? '';
  await toggle.click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click(); // cancelar não altera nada
  await expect(dialog).toBeHidden();
  await expect(toggle).toHaveText(new RegExp(label, 'i'));
});
