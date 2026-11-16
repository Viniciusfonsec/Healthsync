# HealthSync - PostgreSQL

O HealthSync utiliza PostgreSQL como SGBD e Prisma ORM para acesso aos dados. A versão do SGBD utilizada no ambiente local deve ser definida na configuração de execução do projeto; a documentação acadêmica original especifica PostgreSQL 16.

## Criação do banco

No PostgreSQL/pgAdmin, crie um banco vazio chamado `healthsync`.

Depois, no backend, configure:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/healthsync
```

## Aplicação da estrutura

A estrutura oficial do projeto é versionada nas migrations do Prisma:

```text
backend/prisma/migrations/
```

Após instalar as dependências do backend:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
```

O arquivo `healthsync-postgresql.sql` é mantido como representação SQL equivalente à estrutura do Prisma para inspeção acadêmica e instalação manual, quando necessário.
