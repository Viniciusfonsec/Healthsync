process.env.NODE_ENV = 'test';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { createRepositories } from '../src/infrastructure/repositories/InMemoryRepositories.js';
import { AuditRetentionJob } from '../src/infrastructure/scheduler/AuditRetentionJob.js';

test('configurações: senha do SMTP não sai da API e só campos válidos são aceitos', async () => {
  const app = await buildApp();
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'x-auth-mode': 'token' },
      payload: { email: 'admin@healthsync.local', password: process.env.SEED_PASSWORD ?? 'ChangeMe123!' },
    });
    assert.equal(login.statusCode, 200, login.body);
    const headers = { authorization: `Bearer ${login.json().accessToken}` };

    const current = await app.inject({ method: 'GET', url: '/api/v1/admin/settings', headers });
    assert.equal(current.statusCode, 200, current.body);
    assert.equal(current.json().smtp.password, undefined);
    assert.equal(typeof current.json().smtp.hasPassword, 'boolean');

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/settings',
      headers,
      payload: { systemName: 'HealthSync UCB', timezone: 'America/Manaus' },
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.equal(updated.json().systemName, 'HealthSync UCB');
    assert.equal(updated.json().timezone, 'America/Manaus');

    for (const payload of [
      { id: 99 },
      { smtp: { host: 'evil' } },
      { timezone: 'Lua/Base' },
      { primaryColor: 'azul' },
    ]) {
      const rejected = await app.inject({ method: 'PATCH', url: '/api/v1/admin/settings', headers, payload });
      assert.equal(
        rejected.statusCode,
        422,
        `${JSON.stringify(payload)} deveria ser recusado: ${rejected.body}`,
      );
    }

    // Política de senha: o mínimo configurado vale para troca de senha e novos cadastros.
    const policy = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/settings',
      headers,
      payload: { minPasswordLength: 12 },
    });
    assert.equal(policy.statusCode, 200, policy.body);
    const shortPatient = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users/patients',
      headers,
      payload: {
        name: 'Senha Curta',
        email: 'senha.curta@healthsync.local',
        phone: '11999990000',
        cpf: '52998224725',
        birthDate: '1990-01-01',
        gender: 'Outro',
        password: 'Curta1234',
      },
    });
    assert.equal(shortPatient.statusCode, 422, shortPatient.body);
    assert.match(shortPatient.body, /pelo menos 12 caracteres/);
    const shortChange = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers,
      payload: { currentPassword: process.env.SEED_PASSWORD ?? 'ChangeMe123!', newPassword: 'Curta1234' },
    });
    assert.equal(shortChange.statusCode, 422, shortChange.body);
  } finally {
    await app.close();
  }
});

test('auditoria: registros mais antigos que a retenção configurada são apagados', async () => {
  const now = new Date('2026-11-15T12:00:00Z');
  const repos = createRepositories({
    id: 1,
    systemName: 'HealthSync',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    sessionTimeoutMinutes: 360,
    logRetentionDays: 30,
    minPasswordLength: 8,
    mfaRequired: false,
    primaryColor: '#234B65',
    theme: 'light',
    compactMode: false,
    smtp: { host: '', port: 587, tls: true, user: '', password: '' },
    updatedAt: now.toISOString(),
  });
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  for (const age of [1, 29, 31, 400]) {
    await repos.auditLogs.create({ action: 'UPDATE', resource: 'Teste', createdAt: daysAgo(age) });
  }
  assert.equal(await new AuditRetentionJob(repos).run(now), 2);
  assert.equal((await repos.auditLogs.list()).length, 2, 'ficam só os de 1 e 29 dias');
});
