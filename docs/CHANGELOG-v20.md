# HealthSync v20 — validação geral antes do GitHub

## Resultado da validação (rodada com as dependências reais)

| Verificação | Antes | Agora |
|---|---|---|
| Testes de API (`backend: npm test`) | 9 de 36 passando | **41 de 41** |
| Checagem de tipos do backend (`tsc`) | 55 erros (build falhava) | **0** |
| Checagem de tipos do frontend (`tsc`) | 4 erros | **0** |
| Testes de lógica do front (`frontend: npm test`) | 13 de 13 | **13 de 13** |
| `npm run build` do backend | falhava; e o `npm start` não achava `dist/server.js` | compila e o servidor compilado responde |

## Cores
- Cor única da marca: verde petróleo da tela inicial (`#234B65`), definida em `styles/theme.css` como `primary` e na escala `brand-50…950`.
- Todos os tons de azul (`blue-*`, `sky-*`, `indigo-*`, `violet`) e os hexadecimais soltos da tela inicial passaram a usar a escala `brand`.
- Mantidas as cores de significado: verde-esmeralda (confirmado/sucesso), âmbar (aviso), vermelho (erro/cancelado) e rosa no selo "Gestante".
- Cor padrão das configurações do sistema atualizada para `#234B65`.

## Backend
- Removido o `// @ts-nocheck` dos 5 serviços (`Scheduling`, `Admin`, `Patient`, `Professional`, `Notification`) e todos foram tipados.
- As regras de agenda que estavam copiadas em cada serviço foram centralizadas em `application/services/scheduleRules.ts`.
- Tipos de entrada dos serviços em `application/services/dtos.ts` (a camada de aplicação não depende mais da camada HTTP).
- **Correção:** a escolha de unidade do profissional lia o token do cabeçalho em vez do `selectionToken` enviado no corpo.
- **Correção:** as rotas declaravam IDs como texto, e a API devolvia `"3"` numa rota e `3` em outra. Agora todos os IDs são numéricos.
- **Correção de segurança:** os relatórios de faltas e de produtividade mostravam dados de todas as unidades. Agora mostram só a unidade do administrador.
- **Novo (US018):** o profissional pode registrar a falta do paciente (`PATCH /professional/appointments/:id/no-show`). Antes nenhuma tela marcava `FALTA`, e o relatório ficava sempre vazio.
- `prisma.ts`: o adaptador do Prisma cria o próprio pool de conexões (resolve conflito entre versões dos tipos do `pg`).
- `tsconfig.build.json`: o build gera `dist/server.js`, como o `npm start` espera.
- `exactOptionalPropertyTypes` desligado; `strict: true` mantido.

## Frontend
- Botão "Registrar falta" em "Pacientes do dia" (aparece depois do horário da consulta).
- Datas de relatórios, logs, histórico e documentos sem segundos (`formatDateTimeShort`).
- Corrigidos os 4 erros de tipo (login do profissional e botão Voltar).
- Removidos a rota pública `/design-system`, 47 componentes de template sem uso (`components/ui`, exceto `sonner`), `components/figma`, `PlaceholderPage` e `default_shadcn_theme.css`.

## Testes
- Novo `backend/tests/reports-reminders.test.ts`: US004 (lembretes, sem duplicar, ignora canceladas), US018 (registrar falta e relatório por unidade) e US019 (produtividade por unidade e acesso só de administrador).
- Testes existentes atualizados para os IDs numéricos e com CPF válido.

## Testes de integração com PostgreSQL (`npm run test:db`)
- Novo `backend/tests-db/postgres.test.ts` (10 testes): cada operação é feita pela API (Fastify + Prisma) e conferida com SQL direto no banco.
  - Migrations e seed; bloqueio de login gravado no usuário.
  - Agendar (com notificações só com hora e minuto), horário ocupado sem gravar nada, remarcar e cancelar.
  - Preferências do paciente como lista no banco; agendamento sem login.
  - Registrar falta + relatório de faltas; atendimento completo com documento criptografado + relatório de produtividade.
  - Lembretes automáticos sem duplicar.
- `backend/scripts/test-db.mjs` recria o banco de teste (`TEST_DATABASE_URL`), aplica as 6 migrations e roda a suíte. Recusa rodar em banco cujo nome não contenha "test" ou que seja o mesmo do `DATABASE_URL`.
- Variável `USE_DATABASE=true` faz o modo de teste usar o PostgreSQL; `/health` agora informa o banco correto.
- Validado num PostgreSQL 16: 10 de 10, duas execuções seguidas. As migrations aplicam sem erro, e o `database/healthsync-postgresql.sql` gera o mesmo schema que elas.

## Não verificado aqui
- `npx prisma validate` (exige baixar o motor do Prisma): rode no seu computador. As migrations foram aplicadas e testadas direto no PostgreSQL.
- `npm run build` do frontend com Vite (no ambiente de teste só havia binários do Windows): o código foi checado com `tsc` e empacotado com esbuild sem erros.
