# HealthSync — Arquitetura MVC e alinhamento ao Documento 4+1

## 1. Diretriz arquitetural

O Documento de Arquitetura de Software do HealthSync utiliza o modelo 4+1 para representar as visões lógica, de processo, de implementação, de implantação e de casos de uso. O padrão MVC é a arquitetura estrutural utilizada na implementação da aplicação.

A regra de dependência adotada é:

```text
View (React)
   |
   v
Controller (Fastify)
   |
   v
Model (Domínio + Serviços + Repositories)
   |
   v
Prisma ORM
   |
   v
PostgreSQL 16
```

### View

Responsável pela apresentação, interação, formulários, feedback visual e navegação. Não contém regras de persistência nem acesso direto ao banco.

### Controller

Recebe a requisição HTTP, valida entradas, identifica o usuário autenticado, chama o caso de uso correspondente e transforma o resultado em resposta HTTP.

Há um controller por área, todos herdando de `BaseController` (dependências e utilitários comuns), e um arquivo de rotas para cada um:

| Área | Controller | Rotas |
|---|---|---|
| Autenticação | `AuthController` | `auth.routes.ts` |
| Agendamento sem login | `PublicController` | `public.routes.ts` |
| Paciente | `PatientController` | `patient.routes.ts` |
| Notificações | `NotificationController` | `notification.routes.ts` |
| Profissional | `ProfessionalController` | `professional.routes.ts` |
| Administrador da unidade | `AdminController` | `admin.routes.ts` |
| Administrador master | `MasterController` | `master.routes.ts` |

Na documentação Swagger (`/docs`), as rotas aparecem agrupadas pelas mesmas áreas.

### Model

Concentra entidades, regras de negócio, serviços de aplicação e contratos de persistência. O Model não depende da interface React.

### Repositories

São abstrações de acesso a dados usadas pelo Model. A implementação de produção usa Prisma/PostgreSQL; a implementação em memória existe somente para testes automatizados isolados.

Operações que gravam em várias tabelas (agendamento sem login, cadastro de paciente/profissional/administrador, remarcar, cancelar, atendimento) rodam dentro de `repos.transaction(...)`: ou tudo é gravado, ou nada.

### Tarefas automáticas

- `ReminderJob`: cria lembretes (WhatsApp e e-mail) para consultas nas próximas 24 horas, sem duplicar.
- `NotificationDispatcher`: envia as notificações pendentes e grava o resultado (`ENVIADO`, nova tentativa ou `ERRO` após 3 falhas).

## 2. Persistência

A persistência de produção é PostgreSQL com Prisma ORM. O schema oficial do projeto está em `backend/prisma/schema.prisma` e as alterações estruturais são versionadas por migrations em `backend/prisma/migrations`.

O arquivo `database/healthsync-postgresql.sql` gera o mesmo schema que as migrations (conferido em PostgreSQL 16) e serve para inspeção acadêmica e instalação manual.

Um horário do profissional só fica ocupado por consultas ativas (`AGENDADA` ou `CONFIRMADA`), garantido no banco por um índice único parcial: consultas canceladas liberam o horário.

## 3. Requisitos de segurança

O login recebe e-mail e senha. Para profissionais, depois da autenticação a aplicação apresenta as filiais autorizadas para que o profissional escolha o contexto de trabalho. O contexto selecionado é representado no JWT e pode ser alterado sem novo login.

Falhas consecutivas de autenticação incrementam um contador persistente; ao atingir o limite configurado, a conta recebe um bloqueio temporário. O bloqueio e os eventos de auditoria são armazenados no banco, portanto não dependem do estado de memória do processo.

## 4. Agendamento público

O caso de uso de agendamento possui dois canais:

```text
Paciente autenticado -> /patient/appointments
Visitante             -> /public/appointments
```

O endpoint público nunca cria uma consulta sem validar filial, especialidade, profissional, disponibilidade, bloqueios e conflito de horário.

Quando necessário, o visitante é associado a um registro de paciente e a um vínculo com a filial. Usuários convidados não recebem credenciais de acesso automaticamente.

## 5. Princípios de organização

- Controllers não implementam regra de negócio.
- Views não acessam o banco.
- Repositories não decidem regras funcionais.
- A validação HTTP ocorre antes do Model.
- IDs técnicos permanecem como chaves internas, mas não são exibidos desnecessariamente ao usuário.
- Seeds são idempotentes e não duplicam a massa de demonstração.
