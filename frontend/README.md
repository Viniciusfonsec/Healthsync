# HealthSync Frontend

Frontend React 19 + Vite integrado à API do HealthSync.

## Executar

```bash
npm install
npm run dev
```

O frontend utiliza a API local em `http://localhost:3333`. Para outra origem, configure `VITE_API_URL` em `.env`.

## Funcionalidades principais

- Login com filial.
- Redirecionamento por papel, incluindo Admin Master.
- Agendamento público sem login.
- Fluxos completos de paciente, profissional, administrador e Admin Master.
- Formulários com labels associadas aos campos.
- IDs técnicos não são exibidos como informação de usuário nas telas operacionais.


## Contexto de filial do profissional
Após autenticar, profissionais selecionam uma filial de trabalho. A troca de filial no menu lateral atualiza as telas profissionais que dependem desse contexto.
