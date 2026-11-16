import { expect, test, type Page } from '@playwright/test';
import { login, USERS } from './helpers';

/** Escolhe o primeiro dia com horário livre e o primeiro horário. */
async function chooseFirstFreeSlot(page: Page) {
  const days = page.getByRole('radiogroup', { name: 'Datas disponíveis' }).getByRole('radio');
  const slots = page.getByRole('radiogroup', { name: 'Horários disponíveis' }).getByRole('radio');
  const total = await days.count();
  for (let index = 0; index < total; index += 1) {
    await days.nth(index).click();
    await expect(page.getByText(/buscando horários/i)).toBeHidden();
    if (await slots.count()) {
      await slots.first().click();
      return;
    }
  }
  throw new Error('Nenhum horário livre nos próximos dias');
}

test('paciente logado agenda, vê a consulta e remarca reaproveitando a tela de agendamento', async ({ page }) => {
  await login(page, USERS.paciente);
  await expect(page.getByRole('heading', { name: /olá, joão/i })).toBeVisible();

  await page.getByRole('link', { name: /agendar consulta/i }).first().click();
  await expect(page.getByRole('navigation', { name: 'Etapas do agendamento' })).toBeVisible();
  await page.getByRole('button', { name: /HealthSync Clínica Demo/ }).click();
  await page.locator('main').getByRole('button').filter({ has: page.locator('span.font-medium') }).first().click(); // especialidade
  await page.getByRole('button', { name: /Dr\.|Dra\./ }).first().click(); // profissional
  await chooseFirstFreeSlot(page);
  await page.getByRole('radio', { name: /presencial/i }).click();
  await page.getByRole('button', { name: /confirmar agendamento/i }).click();
  await expect(page.getByText('Consulta agendada!')).toBeVisible();

  await page.goto('/patient/appointments');
  const reschedule = page.getByRole('button', { name: 'Remarcar' }).first();
  await expect(reschedule).toBeVisible();
  await reschedule.click();
  await expect(page.getByRole('heading', { name: 'Remarcar consulta' })).toBeVisible();
  await expect(page.getByText(/horário atual/i)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Etapas do agendamento' })).toBeHidden();
  await chooseFirstFreeSlot(page);
  await page.getByRole('button', { name: /confirmar remarcação/i }).click();
  await expect(page.getByText('Consulta remarcada!')).toBeVisible();
});

test('notificações do paciente mostram só hora e minuto e o botão "Ver detalhes"', async ({ page }) => {
  await login(page, USERS.paciente);
  await page.goto('/patient/notifications');
  const items = page.locator('article');
  if (await items.count()) {
    await expect(items.first().getByRole('button', { name: /ver detalhes/i })).toBeVisible();
    await expect(items.first().getByRole('button', { name: /marcar como lida/i })).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText(/\d{2}:\d{2}:\d{2}/);
  }
});
