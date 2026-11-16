import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../../config/env.js';

// O adaptador cria e encerra o próprio pool de conexões com estas opções.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const prisma = new PrismaClient({ adapter });

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
