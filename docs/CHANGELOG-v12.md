# HealthSync v12 — melhorias de interface e navegação

## Página pública
- A rota inicial `/` abre uma página institucional do HealthSync inspirada em padrões de navegação de redes hospitalares, com acesso às unidades, agendamento e login.
- O login continua disponível em `/login`.

## Agendamento
- O local do atendimento não é um campo de texto editável: é derivado do tipo (presencial: `Consultório`; telemedicina: `Atendimento on-line`).
- A API também define o valor no backend, ignorando texto livre enviado pelo navegador, para manter o dado consistente.

## Dashboards
- Indicadores e atalhos do dashboard do paciente, profissional, administrador e master levam diretamente aos módulos correspondentes.
- O dashboard profissional oferece acesso à lista de pacientes do dia, agenda, atendimento, histórico, configurações e notificações.

## Notificações
- Sino disponível em todos os perfis autenticados, com contagem de não lidas atualizada ao navegar, voltar à aba e por consulta periódica.
- A central lista notificações do usuário e permite marcar uma ou todas como lidas.
- Agendamentos criam avisos internos para o profissional responsável, administradores da clínica e administradores master, mantendo as notificações de e-mail/WhatsApp existentes.
- Migration aditiva `backend/prisma/migrations/20261018120000_multi_role_notifications` adiciona a associação por usuário e o canal `IN_APP`; não recria nem apaga dados existentes.

## Gestão global de profissionais
- O Admin Master pode vincular o profissional a uma clínica, a várias clínicas ou a todas as clínicas ativas durante criação e edição.
- Alterações de vínculos são persistidas nas relações profissional-clínica existentes, mantendo a conexão e a estratégia de persistência PostgreSQL/Prisma do projeto.

## Atualização do banco existente
Execute `npm run prisma:generate` e `npm run prisma:migrate` dentro de `backend`, usando a configuração de ambiente já existente. Não recrie o banco e não execute o seed em uma base com dados reais sem intenção de incluir dados de demonstração.

### Correção de upload de documentos (V16)
- Corrigido o cliente HTTP para não forçar `Content-Type: application/json` em requisições `FormData`.
- O navegador agora define automaticamente `multipart/form-data` e seu `boundary`, permitindo que o Fastify receba os arquivos de exames e documentos.
