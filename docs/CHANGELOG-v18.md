# HealthSync v18 — pop-up de erro e consulta na agenda / e-mail

## Pop-up de erro sempre visível
- Antes: só respostas HTTP de erro (exceto 401) geravam pop-up. Validações da tela, falha de rede, erro de login e falha no download de arquivos apareciam apenas na caixa vermelha dentro da página, que pode ficar fora do enquadramento.
- Agora: `frontend/src/app/lib/notify.ts` (`notifyError` e `useErrorToast`). Toda página que guarda `error` mostra o pop-up fixo no topo da janela (30 páginas). O `id` do pop-up é a própria mensagem, então o mesmo erro vindo da API e da página aparece uma vez só.
- `api.ts`: falha de conexão com o servidor agora gera pop-up; 401 sem sessão ativa (ex.: senha incorreta) também.

## Salvar a consulta na agenda do celular
- Novo componente `components/AddToCalendarMenu.tsx` com três opções: arquivo `.ics` (iPhone/Android/Outlook), Google Agenda e, para o paciente logado, e-mail.
- Usado em "Minhas consultas" e na tela de sucesso do agendamento público.
- O `.ics` ganhou lembrete 1 hora antes (VALARM).

## Salvar a consulta por e-mail
- Backend: `AppointmentInviteService` envia o resumo da consulta com o `.ics` anexado.
  - Automático ao agendar (fluxo público e do paciente). Falha no envio não derruba o agendamento.
  - Manual: `POST /api/v1/patient/appointments/:id/calendar-email` (perfil PACIENTE, só da própria consulta, limite de 5 por minuto).
- `EmailGateway` agora suporta assunto, HTML e anexos. Com `SMTP_HOST` configurado envia de verdade; sem ele continua só registrando no console (como antes).
- A resposta de `POST /public/appointments` agora inclui `appointment.id`.

### Para ativar o envio real de e-mail
```bash
cd backend
npm install nodemailer
```
Variáveis de ambiente (`backend/.env`):
```
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM="HealthSync <no-reply@seudominio.com>"
```

## Testes
- `backend/tests/ics.test.ts`: geração do `.ics` (UID estável, UTC, escape e dobra de linhas).
