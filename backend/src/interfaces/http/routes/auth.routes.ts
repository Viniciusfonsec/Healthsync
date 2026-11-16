import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthController } from '../controllers/AuthController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

/** Rotas: Autenticação. */
export function registerAuthRoutes(app: FastifyInstance, c: AuthController, p: string) {
  app.post(
    `${p}/auth/login`,
    {
      // Até 20 tentativas por minuto para o mesmo e-mail vindas do mesmo IP.
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          hook: 'preHandler', // depois de ler o corpo, para usar o e-mail na chave
          keyGenerator: (request: FastifyRequest) =>
            `${request.ip}:${String((request.body as { email?: unknown } | undefined)?.email ?? '').toLowerCase()}`,
        },
      },
    },
    c.login.bind(c),
  );

  app.post(`${p}/auth/professional/select-clinic`, {}, c.selectProfessionalClinic.bind(c));

  app.post(
    `${p}/auth/professional/switch-clinic`,
    {
      preHandler: requireRole('PROFISSIONAL'),
    },
    c.switchProfessionalClinic.bind(c),
  );

  app.get(
    `${p}/auth/me`,
    {
      preHandler: requireAuth,
    },
    c.me.bind(c),
  );

  app.post(
    `${p}/auth/change-password`,
    {
      preHandler: requireAuth,
    },
    c.changePassword.bind(c),
  );

  app.post(`${p}/auth/logout`, c.logout.bind(c));
}
