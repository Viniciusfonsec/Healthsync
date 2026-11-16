import 'dotenv/config';
import { BcryptPasswordHasher } from '../src/infrastructure/crypto/PasswordHasher.ts';
import { seed } from '../src/infrastructure/bootstrap.ts';
import { createPrismaRepositories } from '../src/infrastructure/repositories/PrismaRepositories.ts';
import { disconnectDatabase } from '../src/infrastructure/database/prisma.ts';

const password = process.env.SEED_PASSWORD ?? 'ChangeMe123!';

await seed(createPrismaRepositories(), new BcryptPasswordHasher(), password);
await disconnectDatabase();
