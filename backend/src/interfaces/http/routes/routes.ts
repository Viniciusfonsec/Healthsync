import type { FastifyInstance } from 'fastify';
import { env } from '../../../config/env.js';
import type { Controllers } from '../controllers/index.js';
import { applyRouteDocs } from '../docs/applyRouteDocs.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerPatientRoutes } from './patient.routes.js';
import { registerNotificationRoutes } from './notification.routes.js';
import { registerAdminRoutes } from './admin.routes.js';
import { registerPublicRoutes } from './public.routes.js';
import { registerProfessionalRoutes } from './professional.routes.js';
import { registerMasterRoutes } from './master.routes.js';

/** Registra todas as rotas da API, agrupadas por área. */
export function registerRoutes(app: FastifyInstance, controllers: Controllers) {
  const p = env.API_PREFIX.replace(/\/$/, '');

  // Documentação Swagger de cada rota (resumo, acesso, entradas, respostas): veja docs/routeDocs.ts.
  applyRouteDocs(app, p);
  registerAuthRoutes(app, controllers.auth, p);
  registerPatientRoutes(app, controllers.patient, p);
  registerNotificationRoutes(app, controllers.notification, p);
  registerAdminRoutes(app, controllers.admin, p);
  registerPublicRoutes(app, controllers.public, p);
  registerProfessionalRoutes(app, controllers.professional, p);
  registerMasterRoutes(app, controllers.master, p);
}
