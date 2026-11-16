import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

/** Carrega a configuração num processo separado, com as variáveis informadas. */
function loadEnv(vars: Record<string, string>) {
  return spawnSync(process.execPath, ['--import', 'tsx', '-e', "await import('./src/config/env.ts')"], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH ?? '',
      ESBUILD_BINARY_PATH: process.env.ESBUILD_BINARY_PATH ?? '',
      DOTENV_CONFIG_PATH: '/dev/null',
      ...vars,
    },
    encoding: 'utf8',
  });
}

const base = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

test('produção: recusa subir com as chaves de exemplo', () => {
  const result = loadEnv({
    ...base,
    JWT_SECRET: 'troque-esta-chave-jwt-local',
    DOCUMENT_ENCRYPTION_KEY: 'chave-de-documentos-forte-1',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET e DOCUMENT_ENCRYPTION_KEY/);
});

test('produção: sobe com chaves próprias', () => {
  const result = loadEnv({
    ...base,
    JWT_SECRET: 'chave-jwt-forte-de-producao-1',
    DOCUMENT_ENCRYPTION_KEY: 'chave-de-documentos-forte-1',
  });
  assert.equal(result.status, 0, result.stderr);
});
