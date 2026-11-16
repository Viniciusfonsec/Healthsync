import { expect, test, type Page } from '@playwright/test';
import { login, USERS } from './helpers';

/** Problemas básicos de acessibilidade e de layout na página atual. */
async function audit(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    const visible = (el: Element) => {
      const box = (el as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const nameOf = (el: Element) =>
      (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || (el as HTMLElement).innerText || '').trim();

    for (const field of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
      if (!visible(field)) continue;
      const id = field.getAttribute('id');
      const labelled = (id && document.querySelector(`label[for="${id}"]`)) || field.closest('label') || field.getAttribute('aria-label') || field.getAttribute('aria-labelledby');
      if (!labelled) problems.push(`campo sem rótulo: ${field.outerHTML.slice(0, 90)}`);
    }
    for (const control of document.querySelectorAll('button, a[href]')) {
      if (visible(control) && !nameOf(control) && !control.querySelector('img[alt]:not([alt=""])')) {
        problems.push(`botão/link sem nome: ${control.outerHTML.slice(0, 90)}`);
      }
    }
    for (const image of document.querySelectorAll('img')) {
      if (!image.hasAttribute('alt')) problems.push(`imagem sem alt: ${image.src.slice(0, 60)}`);
    }
    if (!document.querySelector('h1')) problems.push('página sem título h1');
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    if (overflow > 1) problems.push(`rolagem horizontal de ${overflow}px`);
    return problems;
  });
}

const publicPages = ['/', '/login', '/agendamento'];
const patientPages = ['/patient/dashboard', '/patient/schedule', '/patient/appointments', '/patient/history', '/patient/notifications', '/patient/profile'];
const professionalPages = ['/professional/dashboard', '/professional/agenda', '/professional/patients-today', '/professional/history', '/professional/notifications'];
const adminPages = ['/admin/dashboard', '/admin/users', '/admin/specialties', '/admin/reports', '/admin/settings'];

test('páginas públicas: rótulos, nomes acessíveis e sem rolagem lateral', async ({ page }) => {
  for (const path of publicPages) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await audit(page), path).toEqual([]);
  }
});

for (const [role, email, pages] of [
  ['paciente', USERS.paciente, patientPages],
  ['profissional', USERS.profissional, professionalPages],
  ['administrador', USERS.admin, adminPages],
] as const) {
  test(`área do ${role}: rótulos, nomes acessíveis e sem rolagem lateral`, async ({ page }) => {
    await login(page, email);
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await audit(page), path).toEqual([]);
    }
  });
}
