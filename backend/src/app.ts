import './interfaces/http/schemas/zodMessages.js';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { createRepositories as createMemoryRepositories } from './infrastructure/repositories/InMemoryRepositories.js';
import { BcryptPasswordHasher } from './infrastructure/crypto/PasswordHasher.js';
import { seed } from './infrastructure/bootstrap.js';
import { AuthService } from './application/services/AuthService.js';
import {
  ClinicAdminService,
  ReportService,
  MasterClinicService,
  MasterProfessionalService,
  MasterSpecialtyService,
  MasterAdministratorService,
  NotificationService,
  PatientService,
  ProfessionalService,
  SchedulingService,
} from './application/services/AppServices.js';
import { createControllers } from './interfaces/http/controllers/index.js';
import { apiSchemas } from './interfaces/http/docs/apiSchemas.js';
import { registerRoutes } from './interfaces/http/routes/routes.js';
import { ReminderJob } from './infrastructure/scheduler/ReminderJob.js';
import { NotificationDispatcher } from './infrastructure/scheduler/NotificationDispatcher.js';
import { AuditRetentionJob } from './infrastructure/scheduler/AuditRetentionJob.js';
import { EmailGateway, WhatsAppGateway } from './infrastructure/gateways/NotificationGateways.js';
import { AppointmentInviteService } from './application/services/AppointmentInviteService.js';
import { LocalFileStorage } from './infrastructure/storage/LocalFileStorage.js';
import { DocumentCipher } from './infrastructure/crypto/DocumentCipher.js';
import { DocumentService } from './application/services/DocumentService.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, requestIdHeader: 'x-request-id', trustProxy: env.TRUST_PROXY });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((value) => value.trim()),
    credentials: true,
  });
  await app.register(helmet);
  // Limite geral por IP: alto o bastante para uma clínica inteira atrás da mesma rede usar o sistema.
  // O login tem um limite próprio, mais rígido (ver auth.routes.ts), além do bloqueio por senha errada.
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
  await app.register(jwt, { secret: env.JWT_SECRET });
  // Os schemas das rotas servem só para a documentação (Swagger): a validação real de cada
  // entrada é feita pelo zod nos controllers, e as respostas são serializadas sem filtro.
  app.setValidatorCompiler(() => () => true);
  app.setSerializerCompiler(() => (data) => JSON.stringify(data));

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'HealthSync API',
        version: '1.0.0',
        description:
          'API do sistema de agendamento HealthSync.\n\n' +
          '**Autenticação:** o navegador usa o cookie httpOnly `hs_session` (aberto no login) e envia ' +
          '`X-Requested-With: HealthSync` nas requisições que alteram dados. Integrações e este Swagger ' +
          'usam token Bearer: faça o login com o cabeçalho `x-auth-mode: token` e clique em **Authorize**.\n\n' +
          '**Erros:** sempre no formato `{ error: { code, message, details? } }`.',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      tags: [
        { name: 'Autenticação' },
        { name: 'Agendamento público', description: 'Sem login' },
        { name: 'Paciente' },
        { name: 'Notificações' },
        { name: 'Profissional' },
        { name: 'Administrador da unidade' },
        { name: 'Administrador master' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'hs_session' },
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: apiSchemas,
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  const initialSettings = {
    id: 1,
    systemName: 'HealthSync',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    sessionTimeoutMinutes: 360,
    logRetentionDays: 90,
    minPasswordLength: 8,
    mfaRequired: false,
    primaryColor: '#234B65',
    theme: 'light' as const,
    compactMode: false,
    smtp: { host: '', port: 587, tls: true, user: '', password: '' },
    updatedAt: new Date().toISOString(),
  };

  const hasher = new BcryptPasswordHasher();
  const { repos, closeDatabase } =
    env.NODE_ENV === 'test' && !env.USE_DATABASE
      ? { repos: createMemoryRepositories(initialSettings), closeDatabase: async () => undefined }
      : await loadPrismaRepositories();

  await seed(repos, hasher, env.SEED_PASSWORD);
  const fileStorage = new LocalFileStorage(env.STORAGE_DIR);
  await fileStorage.init();
  const documentService = new DocumentService(
    repos,
    fileStorage,
    new DocumentCipher(env.DOCUMENT_ENCRYPTION_KEY),
  );

  const auth = new AuthService(repos, hasher);
  const scheduling = new SchedulingService(repos);
  const patient = new PatientService(repos);
  const notifications = new NotificationService(repos);
  const professional = new ProfessionalService(repos);
  const admin = new ClinicAdminService(repos);
  const reports = new ReportService(repos);
  const masterClinicService = new MasterClinicService(repos);
  const masterProfessionalService = new MasterProfessionalService(repos);
  const masterSpecialtyService = new MasterSpecialtyService(repos);
  const masterAdministratorService = new MasterAdministratorService(repos);
  const emailGateway = new EmailGateway();
  const invites = new AppointmentInviteService(repos, emailGateway);
  const controllers = createControllers({
    auth,
    scheduling,
    patient,
    notifications,
    professional,
    admin,
    reports,
    masterClinicService,
    masterProfessionalService,
    masterSpecialtyService,
    masterAdministratorService,
    documents: documentService,
    hasher,
    repos,
    invites,
  });

  const whatsappGateway = new WhatsAppGateway();
  const reminderJob = new ReminderJob(repos, whatsappGateway, emailGateway, env.REMINDER_INTERVAL_MS);
  // Envia as notificações pendentes (avisos de consulta e lembretes) pelos canais configurados.
  const notificationDispatcher = new NotificationDispatcher(
    repos,
    [whatsappGateway, emailGateway],
    env.REMINDER_INTERVAL_MS,
  );

  const auditRetentionJob = new AuditRetentionJob(repos);

  if (env.NODE_ENV !== 'test') {
    reminderJob.start();
    notificationDispatcher.start();
    auditRetentionJob.start();
  }

  app.get('/health', { config: { rateLimit: false } }, async () => ({
    status: 'ok',
    service: 'healthsync-backend',
    database: env.NODE_ENV === 'test' && !env.USE_DATABASE ? 'memory' : 'postgresql',
    timestamp: new Date().toISOString(),
  }));

  app.addHook('onClose', async () => {
    reminderJob.stop();
    notificationDispatcher.stop();
    auditRetentionJob.stop();
    await closeDatabase();
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const normalized = error as {
      statusCode?: unknown;
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };
    // Violação de unicidade no banco (Prisma P2002), por exemplo dois pedidos simultâneos
    // para o mesmo horário: responde 409 em vez de erro interno.
    if (normalized.code === 'P2002') {
      reply.status(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Este registro já existe. Se for um horário, ele acabou de ser ocupado: escolha outro.',
          requestId: request.id,
        },
      });
      return;
    }
    const status =
      typeof normalized.statusCode === 'number' && Number.isInteger(normalized.statusCode)
        ? normalized.statusCode
        : 500;
    const code =
      normalized.code === 'FST_ERR_VALIDATION'
        ? 'VALIDATION_ERROR'
        : typeof normalized.code === 'string'
          ? normalized.code
          : 'INTERNAL_ERROR';
    const message = typeof normalized.message === 'string' ? normalized.message : 'Erro interno do servidor';
    reply.status(status).send({
      error: {
        code,
        message: status >= 500 ? 'Erro interno do servidor' : message,
        requestId: request.id,
        details: status >= 500 ? undefined : normalized.details,
      },
    });
  });

  registerRoutes(app, controllers);
  return app;
}

async function loadPrismaRepositories() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL é obrigatória para executar o HealthSync fora do ambiente de testes.');
  }
  const [{ createPrismaRepositories }, { disconnectDatabase }] = await Promise.all([
    import('./infrastructure/repositories/PrismaRepositories.js'),
    import('./infrastructure/database/prisma.js'),
  ]);
  return {
    repos: createPrismaRepositories(),
    closeDatabase: disconnectDatabase,
  };
}
