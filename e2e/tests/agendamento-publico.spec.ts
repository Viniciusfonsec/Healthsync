import { expect, test } from '@playwright/test';
import { nextWeekday, randomCpf } from './helpers';

test('visitante agenda uma consulta sem login, do início à confirmação', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /agendar consulta/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Agendar consulta' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Etapas do agendamento' })).toBeVisible();

  await page.getByLabel('Unidade *').selectOption({ label: 'HealthSync Clínica Demo' });
  await page.getByRole('button', { name: /continuar/i }).click();

  const specialty = page.getByLabel('Especialidade *');
  await expect(specialty.locator('option')).not.toHaveCount(1);
  await specialty.selectOption({ index: 1 });
  await page.getByRole('button', { name: /continuar/i }).click();

  const professional = page.getByLabel('Profissional *');
  await expect(professional.locator('option')).not.toHaveCount(1);
  await professional.selectOption({ index: 1 });
  await page.getByRole('button', { name: /continuar/i }).click();

  // Procura o primeiro dia útil com horário livre.
  const slots = page.getByRole('radiogroup', { name: 'Horários disponíveis' }).getByRole('radio');
  for (let offset = 1; offset <= 10; offset += 1) {
    await page.getByLabel('Data *').fill(nextWeekday(offset));
    await expect(page.getByText(/buscando horários/i)).toBeHidden();
    if (await slots.count()) break;
  }
  await slots.first().click();
  await expect(slots.first()).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: /presencial/i }).click();
  await page.getByRole('button', { name: /continuar/i }).click();

  const email = `visitante.${Date.now()}@exemplo.com`;
  await page.getByLabel('Nome completo *').fill('Visitante de Teste');
  await page.getByLabel('CPF *').fill(randomCpf());
  await page.getByLabel('Telefone *').fill('61987654321');
  await page.getByLabel('E-mail *').fill(email);
  await page.getByLabel('Data de nascimento *').fill('1990-05-20');
  await page.getByLabel('Sexo/gênero *').selectOption('Feminino');
  await page.getByLabel(/gestante/i).check();

  const confirm = page.getByRole('button', { name: /confirmar agendamento/i });
  await expect(confirm).toBeDisabled(); // falta o aceite da LGPD
  await page.getByLabel(/aceito compartilhar meus dados/i).check();
  await confirm.click();

  await expect(page.getByRole('heading', { name: 'Consulta agendada com sucesso' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText(/às \d{2}:\d{2}/)).toBeVisible();
});

test('visitante não avança sem escolher a unidade', async ({ page }) => {
  await page.goto('/agendamento');
  await page.getByRole('button', { name: /continuar/i }).click();
  await expect(page.getByRole('alert').first()).toContainText('Escolha uma unidade');
});
