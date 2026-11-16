import type { FastifyInstance } from 'fastify';
import { routeDocs } from './routeDocs.js';
import { zodToJsonSchema, type JsonSchema } from './zodToJsonSchema.js';

const AREAS: Array<[prefix: string, tag: string, access: string]> = [
  ['/auth/me', 'Autenticação', 'Qualquer usuário logado'],
  ['/auth/change-password', 'Autenticação', 'Qualquer usuário logado'],
  ['/auth/professional/switch-clinic', 'Autenticação', 'Profissional'],
  ['/auth', 'Autenticação', 'Público'],
  ['/public', 'Agendamento público', 'Público (sem login)'],
  ['/patient/notifications', 'Notificações', 'Paciente'],
  ['/notifications', 'Notificações', 'Qualquer usuário logado'],
  ['/patient', 'Paciente', 'Paciente'],
  ['/professional', 'Profissional', 'Profissional (na unidade escolhida)'],
  ['/admin', 'Administrador da unidade', 'Administrador da unidade'],
  ['/master', 'Administrador master', 'Administrador master'],
];

const error = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
});

/**
 * Preenche o Swagger de cada rota a partir de `routeDocs`: resumo, quem pode usar,
 * entradas (dos schemas zod), resposta de sucesso e erros possíveis.
 * Os schemas são só documentação: a validação real é feita pelo zod nos controllers.
 */
export function applyRouteDocs(app: FastifyInstance, prefix: string) {
  app.addHook('onRoute', (route) => {
    if (!route.url.startsWith(prefix)) return;
    const path = route.url.slice(prefix.length);
    const method = String(Array.isArray(route.method) ? route.method[0] : route.method).toUpperCase();
    const area = AREAS.find(([start]) => path.startsWith(start));
    if (!area) return;
    const [, tag, access] = area;
    const doc = routeDocs[`${method} ${path}`];
    const isPublic = access.startsWith('Público');

    const responses: Record<string, unknown> = {};
    if (doc?.ok) {
      const [code, description, schema] = doc.ok;
      responses[code] = schema
        ? { description, content: { 'application/json': { schema } } }
        : { description };
    }
    if (doc?.body || doc?.query || doc?.params)
      responses[422] = error('Dados inválidos (erros por campo em `details`)');
    if (!isPublic) {
      responses[401] = error('Sem sessão válida');
      responses[403] = error(
        'Perfil sem permissão, ou faltou o cabeçalho anti-CSRF `X-Requested-With: HealthSync` (sessão por cookie)',
      );
    }
    for (const [code, description] of Object.entries(doc?.errors ?? {})) responses[code] = error(description);

    const jsonSchema = (schema?: Parameters<typeof zodToJsonSchema>[0]): JsonSchema | undefined =>
      schema ? zodToJsonSchema(schema) : undefined;
    const body = jsonSchema(doc?.body);
    const isUpload = path.endsWith('/documents') && method === 'POST';

    route.schema = {
      ...route.schema,
      tags: [tag],
      summary: doc?.summary,
      description: [doc?.description, `**Acesso:** ${access}.`].filter(Boolean).join('\n\n'),
      ...(body ? { body } : {}),
      ...(isUpload ? { consumes: ['multipart/form-data'] } : {}),
      ...(doc?.query ? { querystring: jsonSchema(doc.query) } : {}),
      ...(doc?.params ? { params: jsonSchema(doc.params) } : {}),
      ...(isPublic ? {} : { security: [{ cookieAuth: [] }, { bearerAuth: [] }] }),
      response: responses,
    };
  });
}
