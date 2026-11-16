import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta: um navegador de verdade usa o sistema como o usuário.
 *
 *   cd e2e && npm install && npx playwright install chromium && npm test
 *
 * Sobe sozinho o backend (banco em memória com os dados de demonstração) e o frontend.
 * Se eles já estiverem rodando em 3333/5173, reaproveita.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'computador', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] }, testMatch: /responsivo|acessibilidade/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'npm run dev',
          cwd: '../backend',
          url: 'http://127.0.0.1:3333/health',
          reuseExistingServer: true,
          timeout: 120_000,
          env: { NODE_ENV: 'test', PORT: '3333', HOST: '127.0.0.1' },
        },
        {
          command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
          cwd: '../frontend',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ],
});
