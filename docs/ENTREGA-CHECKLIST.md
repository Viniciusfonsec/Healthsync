# HealthSync — Checklist de Entrega

## Arquitetura

- Implementação estruturada em MVC.
- Documento arquitetural mantido no modelo 4+1 para as visões do sistema.
- View: React 19.
- Controller: Fastify + controllers/routes/validation.
- Model: domínio + serviços + repositories.
- Persistência: Prisma ORM + PostgreSQL (a documentação acadêmica original especifica PostgreSQL 16).
- Identificação: todas as chaves primárias e estrangeiras do domínio são numéricas; a interface não depende de UUIDs como identificadores de entidade.

## Requisitos solicitados

- Limite persistente de tentativas de senha: implementado com bloqueio temporário e auditoria.
- Escolha da filial de trabalho após o login: profissional pode selecionar a unidade em que deseja atuar e alternar o contexto sem novo login.
- Agendamento sem login: implementado por endpoints públicos e tela própria.
- Labels nos campos: padronizadas nos formulários e filtros principais.
- IDs/UIDs técnicos: identificadores persistidos e chaves estrangeiras são numéricos em todas as tabelas; UUIDs não são usados como identificadores de entidades.
- Persistência: schema Prisma, migration PostgreSQL 16 e seed idempotente.

## Validação local recomendada

### 1. Banco

Crie um banco PostgreSQL compatível com o ambiente definido para a entrega e configure `DATABASE_URL` em `backend/.env`. A documentação acadêmica original especifica PostgreSQL 16.

**Importante para esta versão:** houve alteração estrutural das chaves para IDs numéricos. Em uma base de desenvolvimento que ainda contenha o schema antigo com UUIDs, faça backup e recrie o banco antes de aplicar a migration `20261005190000_numeric_ids`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run verify
npm run dev
```

### 3. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run build
npm run dev
```

## Contas de demonstração

A senha é definida por `SEED_PASSWORD`.

- Admin Master: `master@healthsync.local`
- Administrador: `admin@healthsync.local`
- Profissional: `carlos.matos@healthsync.local`
- Paciente: `joaopedro@email.com`

No login, as contas de filial devem usar a clínica correspondente; o Admin Master usa a opção de acesso administrativo global.

## Observação sobre o ambiente de desenvolvimento

O pacote de entrega não inclui `node_modules` nem `dist`. As dependências devem ser instaladas no ambiente de execução para que os binários nativos correspondam ao sistema operacional utilizado.
