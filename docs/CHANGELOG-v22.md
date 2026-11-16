# HealthSync v22: preparação para entrega

## Segurança
- Sessão em cookie `httpOnly` + `SameSite=Strict` (+ `Secure` em produção). O token não fica mais no `localStorage`.
- Proteção contra CSRF: com sessão por cookie, toda alteração exige o cabeçalho `X-Requested-With: HealthSync`.
- `POST /auth/logout` apaga o cookie. Sessão vencida leva o usuário de volta ao login.
- Limite de login: 20 tentativas por minuto por IP e e-mail (o geral subiu para 600/min por IP).
- Em produção o servidor não sobe com as chaves de exemplo nem sem `DATABASE_URL`.
- `TRUST_PROXY`: atrás de proxy, o limite de requisições usa o IP real do usuário.

## Configurações com efeito real
- Duração da sessão (`sessionTimeoutMinutes`): define a validade do cookie e do token.
- Tamanho mínimo da senha: vale em cadastros e trocas de senha.
- Guardar auditoria por N dias: tarefa periódica apaga os registros mais antigos (`AuditRetentionJob`).
- Tela de configurações reorganizada em "Geral" e "Segurança".

## Código
- `AdminService` (grande) dividido em `ClinicAdminService`, `ReportService` e quatro serviços do administrador master.
- Telas de agendamento (público e paciente) com componentes compartilhados: horários, tipo de atendimento, convênio e LGPD.
- Leitura de `?clinicId=` padronizada com zod.
- Nenhum `any` no backend ou no frontend.
- Build de produção corrigida: o cliente do Prisma importava arquivos `.ts` e `node dist/server.js` falhava.

## Documentação da API (Swagger)
- As 69 rotas têm resumo, quem pode acessar, entradas (geradas dos mesmos schemas zod que validam), resposta de sucesso e erros.
- Dois modos de autenticação documentados: cookie e Bearer.
- Casos de uso citados nos resumos com a mesma numeração do Documento de Arquitetura.
- Mensagens de validação da API em português.

## Interface
- Ações padronizadas como botões: o estilo claro (`btn-ghost`) ganhou fundo e borda, os links de texto viraram botões e os cartões clicáveis ganharam um rótulo de ação.
- Filtros de "Minhas consultas" viraram botões; atalhos da tela inicial viraram cartões.
- Acessibilidade: nomes acessíveis no botão do menu do celular e nos ícones, datas e horários como grupos de opções, mês do calendário em português correto.

## Testes
- Backend: 54 testes em memória e 17 no PostgreSQL de verdade.
- Frontend: 22 testes.
- Novo `e2e/` (Playwright): 19 testes no navegador (computador e celular), incluindo uma checagem de acessibilidade em todas as telas.

## Desempenho medido
- Com 20 usuários simultâneos no PostgreSQL, a operação mais lenta (horários livres) levou no máximo 212 ms; meta do documento: 1 segundo.

## Entrega e publicação
- `docker compose up --build` sobe banco, backend (com migrações) e site em `http://localhost:8080`.
- GitHub Actions (`.github/workflows/ci.yml`): tipagem, testes, builds, Prettier, ESLint, Playwright e imagens Docker.
- Guia de publicação com HTTPS: `docs/DEPLOY.md` (VPS com Caddy ou Render/Railway).

## Ao atualizar
```bash
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate
npm run format            # backend e frontend, antes do primeiro envio ao GitHub
```
