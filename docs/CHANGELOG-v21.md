# HealthSync v21 — melhorias de banco, backend e frontend

## Resultado da validação

| Verificação | v20 | v21 |
|---|---|---|
| Testes de API em memória (`backend: npm test`) | 41 | **46** |
| Testes com PostgreSQL real (`backend: npm run test:db`) | 10 | **16** |
| Testes do front (`frontend: npm test`) | 13 | **20** (13 de lógica + 7 de componentes) |
| Erros de tipo (backend e frontend) | 0 | **0** |
| `any` nos controllers | 3 | **0** |

## Banco de dados
- **Bug corrigido:** um horário cancelado nunca mais podia ser agendado (o banco devolvia erro 500). A regra de "horário único" agora vale só para consultas ativas (`AGENDADA`/`CONFIRMADA`), com um índice único parcial.
  - Nova migration: `20261115120000_appointment_active_slot` (`npx prisma migrate deploy`).
  - `database/healthsync-postgresql.sql` atualizado.
- Conflito de dados no banco (dois pedidos simultâneos para o mesmo horário) agora responde **409** com mensagem clara, em vez de erro interno.
- **Transações:** agendamento sem login, cadastro de paciente/profissional/administrador, remarcar, cancelar, disponibilidade e atendimento agora são "tudo ou nada" (`repos.transaction`). Se um passo falha, nada fica gravado pela metade.

## Backend
- **Envio das notificações (US008):** novo `NotificationDispatcher`. Ele envia as notificações pendentes por WhatsApp (simulado) e e-mail (SMTP, se configurado) e grava o resultado:
  - `ENVIADO`, com a data do envio;
  - nova tentativa, se o envio falhar;
  - `ERRO` depois de 3 falhas ou quando não há telefone/e-mail.
  - Antes, as notificações ficavam "pendentes" para sempre.
- **Organização:** o `controllers.ts` (1.205 linhas) virou 7 controllers por área + `BaseController`, e o `routes.ts` (844 linhas) virou 7 arquivos de rotas. O Swagger (`/docs`) agrupa as rotas pelas mesmas áreas.
- `parse()` dos controllers agora é tipado (devolve o tipo do schema zod em vez de `any`).
- Conversões do Prisma tipadas com os modelos gerados (eliminadas cerca de 30 conversões `as any`).
- **Segurança das configurações:**
  - `PATCH /admin/settings` aceitava qualquer campo sem validação. Agora só aceita os campos permitidos, com validação de fuso horário, cor e limites.
  - A senha do SMTP não é mais devolvida pela API.
  - Toda alteração gera registro de auditoria.
- **Política de senha:** o tamanho mínimo configurado (`minPasswordLength`) vale na troca de senha e nos cadastros de paciente, profissional e administrador.
- Prettier (`npm run format`) e ESLint (`eslint.config.js`) configurados.

## Frontend
- `ScheduleStepper`: o passo a passo do agendamento é um componente único, usado com e sem login.
- `PatientSchedule.tsx` dividido: as etapas de unidade, especialidade e profissional viraram componentes em `pages/patient/schedule/`.
- `useConfirm()`: as 5 confirmações do navegador (`window.confirm`) viraram um modal no estilo do sistema, com botão vermelho para ações como desativar ou registrar falta.
- Removidas 39 bibliotecas sem uso do `package.json` e do `package-lock.json` (de 314 para 191 pacotes no lock).
- Testes de componentes (renderização sem navegador): passo a passo, selos e seletor de preferências, botão Voltar e etapas do agendamento.
- Prettier e ESLint configurados.

## Testes novos
- `backend/tests/notification-dispatcher.test.ts`: envio, novas tentativas, erro sem destinatário.
- `backend/tests/transactions.test.ts`: agendamento sem login desfeito quando a consulta falha.
- `backend/tests/admin-settings.test.ts`: senha do SMTP escondida, campos inválidos recusados, política de senha.
- `backend/tests-db/postgres.test.ts` (+6):
  - horário cancelado reagendável e pedidos simultâneos;
  - transação desfeita e agendamentos públicos simultâneos sem paciente órfão;
  - cadastro de profissional pelo master;
  - envio das notificações.
- `frontend/tests/components.test.tsx`.

## Não feito (e por quê)
- **Login em cookie `httpOnly`** em vez do `localStorage`: exige o pacote `@fastify/cookie` (não instalado) e proteção contra CSRF. Fica como melhoria futura; para o escopo acadêmico, o token com expiração e o CORS restrito são aceitáveis.
- **Formatação de todo o código:** os arquivos de configuração estão prontos, mas o Prettier não pôde ser baixado no ambiente de geração. Rode `npm run format` no backend e no frontend uma vez antes de subir para o GitHub.
- `mfaRequired` e `logRetentionDays` continuam gravados nas configurações, mas ainda sem efeito.
