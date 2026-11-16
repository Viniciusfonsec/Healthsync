# HealthSync Backend

API do HealthSync em Node.js 22 + TypeScript + Fastify.

## Arquitetura

O projeto utiliza MVC na implementação:

- **Controller:** `src/interfaces/http/controllers` e `src/interfaces/http/routes`.
- **Model:** `src/domain`, `src/application/services` e `src/infrastructure/repositories`.
- **View:** pertence ao frontend React.

A documentação do projeto utiliza 4+1 como visão arquitetural; este README registra explicitamente como o 4+1 se materializa no MVC da aplicação.

## Persistência

Produção/desenvolvimento: PostgreSQL + Prisma ORM.

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations`
- Seed: `prisma/seed.ts`
- Cliente Prisma: `src/infrastructure/database/prisma.ts`
- Repositories de produção: `src/infrastructure/repositories/PrismaRepositories.ts`
- Repositories de memória: `src/infrastructure/repositories/InMemoryRepositories.ts` (testes)

## Configuração

Crie `.env` a partir de `.env.example` e informe pelo menos:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthsync
JWT_SECRET=uma-chave-com-no-minimo-16-caracteres
```

## Atualização desta versão sem recriar o banco

A versão adiciona notificações internas por usuário para os perfis paciente, profissional, administrador e administrador master. A migration `20261018120000_multi_role_notifications` é aditiva: habilita o canal `IN_APP`, permite notificações sem `patientId` e acrescenta `userId` com chave estrangeira e índice. Os registros existentes não são apagados.

Para atualizar uma instalação que já tem dados, execute na pasta `backend` usando o mesmo `.env` e a mesma `DATABASE_URL` já configurados:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

Não é necessário apagar/criar o banco novamente. Não execute `db:seed` em uma base existente a menos que queira inserir os dados de demonstração.

## Comandos

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

Verificação:

```bash
npm run prisma:validate
npm run lint:typecheck
npm test          # banco em memória
npm run test:db   # PostgreSQL real (veja TEST_DATABASE_URL no .env.example)
npm run build
```

## Contas de demonstração

A senha é a definida por `SEED_PASSWORD`.

- Admin Master: `master@healthsync.local` — selecionar **Acesso administrativo global**.
- Paciente: `joaopedro@email.com`.
- Profissional: `carlos.matos@healthsync.local` (seleção de filial após o login).
- Profissional multi-filial: `ana.ribeiro@saudeintegrada.local` (acesso à Clínica Saúde Integrada e à HealthSync Clínica Demo).
- Administrador: `admin@healthsync.local`.

## Endpoints públicos relevantes

```text
GET  /api/v1/public/clinics
GET  /api/v1/public/catalog/specialties?clinicId=...
GET  /api/v1/public/catalog/professionals?clinicId=...
GET  /api/v1/public/availability?professionalId=...&date=YYYY-MM-DD
POST /api/v1/public/appointments
```

O agendamento público não exige JWT, mas aplica as mesmas regras essenciais de disponibilidade, conflito e integridade de filial.


## E-mail (convite da agenda)
O backend envia o resumo da consulta com o convite `.ics` anexado. Sem `SMTP_HOST` o envio é apenas simulado no console.
Para enviar de verdade: `npm install nodemailer` e defina `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`. Detalhes em `docs/CHANGELOG-v18.md`.
