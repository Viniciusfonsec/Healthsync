// Testes de integração com PostgreSQL de verdade: npm run test:db
//
// 1. Lê TEST_DATABASE_URL do .env (um banco SEPARADO, cujo nome precisa conter "test").
// 2. Apaga e recria o schema public desse banco e aplica, em ordem, os mesmos
//    arquivos de prisma/migrations/*/migration.sql que o `prisma migrate deploy` aplica.
// 3. Roda tests-db/*.test.ts com o backend usando o Prisma (USE_DATABASE=true).
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error('Defina TEST_DATABASE_URL no backend/.env, por exemplo:');
  console.error('TEST_DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/healthsync_test');
  console.error('Crie o banco antes: CREATE DATABASE healthsync_test;');
  process.exit(1);
}

const databaseName = new URL(url).pathname.replace(/^\//, '');
if (!/test/i.test(databaseName)) {
  console.error(
    `Recusado: o banco "${databaseName}" não parece ser de teste (o nome precisa conter "test").`,
  );
  console.error('Este script APAGA todos os dados do banco informado.');
  process.exit(1);
}
if (process.env.DATABASE_URL && process.env.DATABASE_URL === url) {
  console.error('Recusado: TEST_DATABASE_URL é igual a DATABASE_URL. Use um banco separado para os testes.');
  process.exit(1);
}

const migrationsDir = path.resolve('prisma/migrations');
const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  console.log(`Recriando o banco de teste "${databaseName}"...`);
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  for (const name of migrations) {
    await client.query(readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8'));
    console.log(`  migration aplicada: ${name}`);
  }
} finally {
  await client.end();
}

const storageDir = mkdtempSync(path.join(tmpdir(), 'healthsync-test-docs-'));
const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', '--test-concurrency=1', 'tests-db/*.test.ts'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      USE_DATABASE: 'true',
      DATABASE_URL: url,
      STORAGE_DIR: storageDir,
    },
  },
);
rmSync(storageDir, { recursive: true, force: true });
process.exit(result.status ?? 1);
