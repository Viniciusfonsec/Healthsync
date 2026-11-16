process.env.NODE_ENV = 'test';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('Swagger: toda rota da API tem resumo, área, resposta de sucesso e erros documentados', async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({ method: 'GET', url: '/docs/json' });
    assert.equal(response.statusCode, 200);
    const spec = response.json() as {
      paths: Record<
        string,
        Record<
          string,
          { summary?: string; tags?: string[]; responses?: Record<string, unknown>; security?: unknown[] }
        >
      >;
    };
    const problems: string[] = [];
    let routes = 0;
    for (const [path, operations] of Object.entries(spec.paths)) {
      if (!path.startsWith('/api/v1/')) continue;
      for (const [method, operation] of Object.entries(operations)) {
        routes += 1;
        const name = `${method.toUpperCase()} ${path}`;
        if (!operation.summary) problems.push(`${name}: sem resumo`);
        if (!operation.tags?.length) problems.push(`${name}: sem área`);
        const codes = Object.keys(operation.responses ?? {});
        if (!codes.some((code) => code.startsWith('2'))) problems.push(`${name}: sem resposta de sucesso`);
        const isPublic =
          path.includes('/public/') || /\/auth\/(login|logout|professional\/select-clinic)$/.test(path);
        if (!isPublic && !(codes.includes('401') && operation.security?.length))
          problems.push(`${name}: sem autenticação documentada`);
      }
    }
    assert.ok(routes >= 69, `esperava todas as rotas, vieram ${routes}`);
    assert.deepEqual(problems, []);
  } finally {
    await app.close();
  }
});

test('validação: mensagens dos campos em português', async () => {
  const app = await buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/availability?professionalId=abc&date=ontem',
    });
    assert.equal(response.statusCode, 422);
    const fields = (response.json() as { error: { details: { fieldErrors: Record<string, string[]> } } })
      .error.details.fieldErrors;
    assert.deepEqual(fields.professionalId, ['Deve ser um número']);
    assert.ok(
      Object.values(fields)
        .flat()
        .every((message) => !/expected|invalid|required/i.test(message)),
      JSON.stringify(fields),
    );
  } finally {
    await app.close();
  }
});
