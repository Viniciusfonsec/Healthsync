# HealthSync

Sistema web de agendamento e atendimento em saúde desenvolvido como projeto acadêmico.

## Arquitetura

A documentação utiliza o modelo arquitetural 4+1 para organizar as diferentes visões do sistema. A implementação do software adota MVC, com separação clara entre apresentação (View), controle HTTP (Controller) e modelo de negócio/dados (Model).

### Mapeamento MVC

- **View:** React 19, páginas, componentes e formulários.
- **Controller:** controllers HTTP do Fastify, rotas e validação de entrada.
- **Model:** entidades de domínio, serviços de aplicação, repositories e persistência Prisma.
- **Persistência:** PostgreSQL 16 acessado exclusivamente por Prisma ORM.

A separação evita acoplamento entre regras de negócio e infraestrutura e mantém os casos de uso documentados no projeto como referência funcional.

## Requisitos

- Node.js 22.x
- PostgreSQL 16
- npm

## Executar com Docker (o jeito mais rápido)

Com o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado, na raiz do projeto:

```bash
docker compose up --build
```

Abra `http://localhost:8080`. O comando sobe o PostgreSQL, aplica as migrações, cria as contas de demonstração e serve o site; a API e o Swagger ficam em `http://localhost:8080/api/v1` e `http://localhost:8080/docs`. Para parar: `docker compose down` (os dados ficam guardados; `docker compose down -v` apaga tudo).

Para publicar na internet com HTTPS, veja [docs/DEPLOY.md](docs/DEPLOY.md).

## Executar sem Docker

### Executar o banco

O projeto utiliza PostgreSQL 16 diretamente, conforme definido no Documento de Arquitetura de Software.

Crie um banco chamado `healthsync` em uma instalação local do PostgreSQL 16 e ajuste `backend/.env`. O arquivo `database/healthsync-postgresql.sql` contém o SQL equivalente à estrutura inicial para instalação manual/inspeção.

### Executar o backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

API: `http://localhost:3333`
Swagger: `http://localhost:3333/docs` (todas as rotas, com quem pode acessar, entradas e respostas; para testar rotas protegidas, faça o login com o cabeçalho `x-auth-mode: token` e use o token em **Authorize**)
Health: `http://localhost:3333/health`

### Executar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## Fluxos principais

- Login por e-mail e senha; profissionais escolhem a unidade após a autenticação.
- Bloqueio temporário após tentativas consecutivas de senha inválida.
- Agendamento autenticado pelo paciente.
- Agendamento público sem login.
- Remarcação e cancelamento.
- Agenda e atendimento do profissional.
- Administração por unidade.
- Administração Master para múltiplas filiais.
- Notificações, auditoria e configurações.

## Segurança

- Sessão em cookie `httpOnly` + `SameSite=Strict` (o JavaScript da página não acessa o token); `Secure` em produção.
- Proteção contra CSRF: alterações com sessão por cookie exigem o cabeçalho `X-Requested-With: HealthSync`.
- Duração da sessão, tamanho mínimo de senha e tempo de guarda da auditoria definidos nas configurações do administrador.
- Em produção o servidor se recusa a subir com as chaves de exemplo.
- JWT assinado; integrações podem usar token Bearer (`x-auth-mode: token` no login).
- RBAC por papel.
- bcrypt para senhas.
- Limitação de requisições (geral por IP e 20 tentativas de login por minuto por e-mail).
- Helmet e CORS.
- Validação com Zod.
- Controle persistente de tentativas de login.
- Dados técnicos não são exibidos desnecessariamente na interface.

## Testes e verificação

O backend usa Node Test Runner e possui cenários para autenticação, RBAC, agenda, conflitos, atendimento, bloqueio de senha, unidade e agendamento público.

```bash
cd backend
npm test
```

Para validação completa do backend:

```bash
npm run verify
```

### Testes com o PostgreSQL de verdade

`npm test` usa um banco em memória (rápido, não precisa de PostgreSQL). Para testar a gravação real no banco:

1. Crie um banco separado só para testes: `CREATE DATABASE healthsync_test;`
2. No `backend/.env`, informe `TEST_DATABASE_URL=postgresql://USUARIO:SENHA@localhost:5432/healthsync_test`
3. Rode:

```bash
cd backend
npm run test:db
```

O script apaga e recria esse banco, aplica as migrations e confere cada operação da API com consultas SQL diretas. Ele se recusa a rodar se o nome do banco não contiver "test" ou se for o mesmo do `DATABASE_URL`.

No frontend, `npm test` roda os testes de lógica (datas, preferências e filtros) e de componentes (passo a passo do agendamento, selos e seletor de preferências, botão Voltar, etapas do agendamento).

### Testes no navegador (ponta a ponta)

A pasta `e2e/` usa o Playwright para abrir o sistema num navegador de verdade, no computador e no celular: agendamento público, agendamento e remarcação do paciente, profissional com várias unidades, relatórios do administrador, segurança e uma checagem de acessibilidade em todas as telas.

```bash
cd e2e
npm install
npx playwright install chromium
npm test            # sobe backend (banco em memória) e frontend sozinho
```

### Verificação automática (GitHub Actions)

A cada envio para o GitHub, `.github/workflows/ci.yml` roda: tipagem, testes do backend (memória e PostgreSQL), testes e build do frontend, Prettier e ESLint, testes no navegador e a construção das imagens Docker, testando o login pelo nginx.

### Formatação e lint

```bash
npm run format        # formata o código com Prettier (baixa o Prettier na primeira vez)
npm run format:check  # só confere
```

Para o ESLint, instale uma vez as ferramentas e depois rode `npm run lint`:

```bash
# backend
npm install -D eslint@9 @eslint/js@9 typescript-eslint@8
# frontend
npm install -D eslint@9 @eslint/js@9 typescript-eslint@8 eslint-plugin-react-hooks@5 globals@15
```

## Demonstração

A carga inicial é criada de forma idempotente somente quando o banco ainda está vazio. A senha das contas de demonstração é definida por `SEED_PASSWORD`.


### Regra de negócio — pacientes e unidades
Pacientes podem agendar em qualquer unidade ativa da rede. O vínculo `PatientClinic` é criado de forma controlada no primeiro agendamento naquela unidade; não é necessário cadastrar previamente o paciente em todas as unidades. Profissionais, por sua vez, podem possuir múltiplos vínculos `ProfessionalClinic` e escolhem a unidade de trabalho após a autenticação.

## Identificação e relacionamentos

As entidades persistidas utilizam identificadores numéricos autogerados e chaves estrangeiras numéricas. UUID não é utilizado como identificador de entidade. Valores aleatórios permanecem apenas em contextos que não representam chaves de banco, como credenciais temporárias ou nomes internos de armazenamento.

A migration `20261005190000_numeric_ids` substitui o modelo anterior baseado em UUIDs. Para uma base de desenvolvimento criada com a versão anterior, faça backup e recrie o banco antes de aplicar esta migration.


## Atualizações de interface e agendamento (v12)

- O cadastro de profissional exige escolher explicitamente a unidade inicial; o vínculo a outras unidades continua sendo gerenciado separadamente.
- O paciente não possui unidade fixa no perfil clínico. As consultas registram a unidade escolhida para cada agendamento, e a migração preserva os vínculos antigos existentes em `PatientClinic`.
- Os agendamentos público e autenticado consultam horários disponíveis reais, mostram os dias/horários cadastrados e bloqueiam a confirmação quando os dados/horário não são válidos.
- O agendamento público mostra progresso por etapas, ocupa uma área maior, identifica campos obrigatórios, aplica máscaras CPF/telefone, valida o dígito verificador do CPF e exibe aviso de privacidade/LGPD. Mensagens de erro desaparecem automaticamente.
- Agendamentos de telemedicina recebem e persistem um link de sala Jitsi, mostrado nas telas de confirmação e nas áreas de consulta pertinentes. Trata-se de uma integração básica com sala pública por URL; não é uma integração institucional/autenticada de telemedicina. Para uso com pacientes reais, a clínica deve avaliar autenticação, consentimento, privacidade e contrato com o provedor.
- Após a confirmação do agendamento, a página de confirmação fica visível por 10 segundos para mostrar os dados e o link, e então direciona para a página inicial pública da unidade.
- O dashboard do paciente inclui calendário mensal com navegação entre meses e consultas agrupadas por dia.
- A agenda do profissional mostra informações cadastrais necessárias dos pacientes agendados e o link de teleconsulta, respeitando a unidade selecionada pelo profissional.

### Atualização de banco já existente

Depois de atualizar os arquivos, na pasta `backend`, execute:

```bash
npm run prisma:generate
npm run prisma:migrate
```

A migração `20261012130000_teleconsultation_url` cria o campo de link da teleconsulta. A migração `20261012140000_global_patient_registration` preserva os vínculos legados e remove a coluna de unidade fixa do paciente. Faça backup do banco antes de aplicar migrações em ambientes importantes.
