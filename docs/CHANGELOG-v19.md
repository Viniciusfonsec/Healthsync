# HealthSync v19 — mudanças solicitadas pelo professor

| # | Pedido | O que foi feito |
|---|---|---|
| 1 | "Olá, (nome)" junto | Saudação usa `user.name` (fallback: início do e-mail separado por `. _ -`). `lib/format.ts → firstNameOf` |
| 2 | Remarcar reaproveitando agendamento | `PatientSchedule` aceita `?remarcar=<id>`: pré-preenche clínica/especialidade/profissional, vai direto à escolha de horário e confirma via `reschedule`. Modal de remarcação removido |
| 3 | Notificação só hora e minuto | Backend: `formatDateTimeBR` ("10/11/2026 às 14:30", fuso São Paulo). Front: `stripSeconds` limpa notificações antigas |
| 4 | Sem tempo de consulta para pacientes | Removido de telas do paciente, agendamento público, e-mail e ICS (DTEND continua correto). Profissional mantém |
| 5 | Botão "Voltar" | Componente `BackButton` (mesmo estilo do agendamento), usado no layout, login, agendamento etc. |
| 6 | Médico: botão na notificação | "Ver detalhes" e "Marcar como lida" viraram botões |
| 7 | Padronizar botões | `styles/buttons.css` (`.btn`, `-primary/-secondary/-danger/-success/-ghost`, `-sm`); ~66 botões migrados |
| 8 | Dia em português | `formatWeekdayDate` (Intl pt-BR) + status traduzidos |
| 9 | Filtro por nome em "Pacientes do dia" | Busca sem acento/caixa + filtro por preferência |
| 10 | Preferência do paciente | Idoso / Gestante / Pessoa com deficiência: perfil, agendamento público, agenda do médico (badges). "Idoso" automático com 60+ |
| 11 | Notificação do paciente | Somente botão "Ver detalhes" |
| 12 | Testes | Ver abaixo |

## Banco de dados
Nova migration `20261110120000_patient_priorities` (enum `PatientPriority` + coluna `priorities`).
Aplicar: `cd backend && npx prisma migrate deploy`. O script `database/healthsync-postgresql.sql` também foi atualizado.

## Testes
- API: `backend/tests/changes-v19.test.ts` — `cd backend && npm test`
- Front (lógica): `frontend/tests/format.test.ts` — `cd frontend && npm install && npm test` (12 testes, executados e aprovados)
- Corrigido `smoke.test.ts` (agendamento público não enviava `lgpdConsentAccepted: true`).

## Não verificado
Sem dependências instaladas no ambiente de geração: build do front/back e a suíte de API **não foram executados** (apenas checagem de sintaxe/tipos filtrada). Rode `npm test` no backend e `npm run build` no front antes de apresentar.

## Ajustes após teste (v19.1)
- Removida a barra "Buscar..." do topo (`MainLayout.tsx`), que não tinha função, em todos os perfis. As buscas próprias de cada tela (pacientes do dia, admin, master) continuam.
- Passo a passo do agendamento do paciente logado (`PatientSchedule.tsx`) agora usa a mesma linha de progresso do agendamento sem login. Antes a linha existia, mas ficava escondida atrás do fundo (`-z-10`).

## Correções da revisão geral (v19.2)
- Notificação do agendamento feito pelo paciente logado ainda mostrava a data ISO com segundos (`SchedulingService.createAppointment`). Agora usa `formatDateTimeBR`.
- Front: `stripSeconds` também converte datas ISO de notificações antigas já gravadas no banco (+1 teste).
- Criado `backend/.env.example`, citado no README mas ausente no pacote.
