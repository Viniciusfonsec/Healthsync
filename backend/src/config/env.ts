import 'dotenv/config';
import { z } from 'zod';
import path from 'node:path';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3333),
  API_PREFIX: z.string().default('/api/v1'),
  JWT_SECRET: z.string().min(16).default('change-this-secret-in-development'),
  CLINIC_SELECTION_EXPIRES_IN: z.string().default('10m'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  STORAGE_DIR: z.string().default('./storage/documents'),
  REMINDER_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  SEED_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  DATABASE_URL: z.string().url().optional(),
  // Cookie de sessão só por HTTPS. Padrão: ligado em produção.
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  // Atrás de um proxy (nginx, Render, Railway): usa o IP real do usuário (X-Forwarded-For) no limite de requisições.
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  // Em NODE_ENV=test o padrão é o banco em memória; USE_DATABASE=true usa o PostgreSQL (npm run test:db).
  USE_DATABASE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
  DOCUMENT_ENCRYPTION_KEY: z.string().min(16).default('change-document-key-in-development'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('HealthSync <no-reply@healthsync.local>'),
});

const parsed = EnvSchema.parse(process.env);

// Em produção, as chaves precisam ser trocadas: com as de exemplo, qualquer um forjaria sessões.
if (parsed.NODE_ENV === 'production') {
  const weak = (value: string) => /troque|change|exemplo/i.test(value);
  if (weak(parsed.JWT_SECRET) || weak(parsed.DOCUMENT_ENCRYPTION_KEY)) {
    throw new Error('Defina JWT_SECRET e DOCUMENT_ENCRYPTION_KEY próprios antes de rodar em produção.');
  }
  if (!parsed.DATABASE_URL) throw new Error('Defina DATABASE_URL para rodar em produção.');
}
export const env = {
  ...parsed,
  COOKIE_SECURE: parsed.COOKIE_SECURE ? parsed.COOKIE_SECURE === 'true' : parsed.NODE_ENV === 'production',
  STORAGE_DIR: path.resolve(process.cwd(), parsed.STORAGE_DIR),
} as const;
