process.env.NODE_ENV = 'test';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

const PASSWORD = process.env.SEED_PASSWORD ?? 'ChangeMe123!';

function sessionCookie(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie ?? '');
  const match = /hs_session=([^;]*)/.exec(header);
  assert.ok(match, `cookie de sessão ausente: ${header}`);
  return `hs_session=${match[1]}`;
}

test('navegador: sessão em cookie httpOnly, sem token no corpo, com proteção CSRF e logout', async () => {
  const app = await buildApp();
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'joaopedro@email.com', password: PASSWORD },
    });
    assert.equal(login.statusCode, 200, login.body);
    assert.equal(login.json().accessToken, undefined, 'o token não pode ir para o JavaScript da página');
    assert.equal(login.json().user.email, 'joaopedro@email.com');
    const setCookie = String(login.headers['set-cookie']);
    for (const flag of ['HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=21600'])
      assert.match(setCookie, new RegExp(flag));
    const cookie = sessionCookie(login.headers['set-cookie']);

    const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });
    assert.equal(me.statusCode, 200, me.body);

    // Alterar dados só com o cabeçalho anti-CSRF.
    const profilePatch = {
      method: 'PATCH' as const,
      url: '/api/v1/patient/profile',
      payload: { phone: '61999998888' },
    };
    const withoutHeader = await app.inject({ ...profilePatch, headers: { cookie } });
    assert.equal(withoutHeader.statusCode, 403, withoutHeader.body);
    assert.match(withoutHeader.body, /CSRF/);
    const withHeader = await app.inject({
      ...profilePatch,
      headers: { cookie, 'x-requested-with': 'HealthSync' },
    });
    assert.equal(withHeader.statusCode, 200, withHeader.body);

    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
    assert.equal(logout.statusCode, 200);
    assert.match(String(logout.headers['set-cookie']), /hs_session=;.*Max-Age=0/);

    const forged = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: 'hs_session=token-falso' },
    });
    assert.equal(forged.statusCode, 401);
    const none = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    assert.equal(none.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('integrações: token Bearer só quando pedido, e a duração segue a configuração do sistema', async () => {
  const app = await buildApp();
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'x-auth-mode': 'token' },
      payload: { email: 'admin@healthsync.local', password: PASSWORD },
    });
    assert.equal(login.statusCode, 200, login.body);
    const { accessToken, expiresIn } = login.json() as { accessToken: string; expiresIn: number };
    assert.ok(accessToken);
    assert.equal(expiresIn, 360 * 60);

    // Bearer não depende do cabeçalho anti-CSRF (não é enviado automaticamente pelo navegador).
    const changed = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/settings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { sessionTimeoutMinutes: 30 },
    });
    assert.equal(changed.statusCode, 200, changed.body);

    const again = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@healthsync.local', password: PASSWORD },
    });
    assert.equal(again.json().expiresIn, 30 * 60);
    assert.match(String(again.headers['set-cookie']), /Max-Age=1800/);
  } finally {
    await app.close();
  }
});

test('limite de tentativas de login por e-mail não bloqueia outros usuários do mesmo IP', async () => {
  const app = await buildApp();
  try {
    const attempt = (email: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'senha-errada-123' },
      });
    const statuses: number[] = [];
    for (let index = 0; index < 21; index += 1)
      statuses.push((await attempt('naoexiste@healthsync.local')).statusCode);
    assert.equal(statuses.at(-1), 429, 'a 21ª tentativa no mesmo e-mail é limitada');
    const other = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'joaopedro@email.com', password: PASSWORD },
    });
    assert.equal(other.statusCode, 200, 'outro e-mail no mesmo IP continua entrando');
  } finally {
    await app.close();
  }
});
