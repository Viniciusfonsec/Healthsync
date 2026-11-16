# 7. Visão de Implantação

Texto pronto para a seção 7 do Documento de Arquitetura de Software.

## 7.1 Nodos físicos

| Nodo | Função | Software |
|---|---|---|
| Dispositivo do usuário | Acessa o sistema pelo navegador (paciente, profissional, administrador, master) | Google Chrome, Microsoft Edge ou Firefox |
| Servidor web (frontend) | Entrega a interface e encaminha `/api`, `/health` e `/docs` para o backend | Build do React 19 + Vite servido por nginx 1.27 (container `frontend`) |
| Servidor de aplicação (backend) | API REST, regras de negócio, sessão JWT em cookie, lembretes, envio de notificações e limpeza da auditoria | Node.js 22 + Fastify 5 (container `backend`) |
| Servidor de banco de dados | Persistência dos dados | PostgreSQL 16 (container `db`), acessado via Prisma ORM 7 |
| Armazenamento de arquivos | Documentos clínicos anexados, criptografados (AES-256-GCM) | Pasta configurada em `STORAGE_DIR` no servidor de aplicação |
| Serviços externos | Envio de e-mail (resumo e convite `.ics`) e WhatsApp | Servidor SMTP (opcional); WhatsApp simulado nesta versão |

## 7.2 Comunicação entre os nodos

```
Navegador ──HTTPS──▶ Proxy com certificado (Caddy ou o do provedor)
                       └──▶ nginx (frontend) ──┬──▶ arquivos do React
                                               └──▶ /api, /health, /docs ──HTTP (rede interna)──▶ API Fastify :3333
API Fastify ──TCP 5432 (rede interna)──▶ PostgreSQL 16
API Fastify ──SMTP (TLS)──▶ Servidor de e-mail
```

- Site e API ficam no **mesmo endereço**: o nginx encaminha as chamadas da API. Assim o cookie de sessão (`httpOnly`, `Secure`, `SameSite=Strict`) funciona sem CORS.
- O HTTPS é terminado no proxy da frente. Em desenvolvimento a aplicação roda em HTTP (`localhost:5173` e `localhost:3333`).
- O banco de dados não é exposto à internet: só a API acessa a porta 5432.
- A API usa o IP real do usuário (`X-Forwarded-For`, com `TRUST_PROXY=true`) para limitar requisições.

## 7.3 Artefatos implantados

| Artefato | Gerado por | Implantado em |
|---|---|---|
| Imagem `frontend` (nginx + `dist/`) | `frontend/Dockerfile` | Servidor web |
| Imagem `backend` (`dist/` + `node_modules`) | `backend/Dockerfile` | Servidor de aplicação |
| Migrations `backend/prisma/migrations/*` | Prisma | Aplicadas no PostgreSQL pelo próprio backend ao iniciar (`prisma migrate deploy`) |
| `docker-compose.yml` | — | Sobe as três peças juntas (local ou VPS) |
| `backend/.env` | Configuração manual (modelo em `.env.example`) | Servidor de aplicação (nunca versionado) |

## 7.4 Configuração

Variáveis principais do `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `DOCUMENT_ENCRYPTION_KEY`, `CORS_ORIGIN`, `STORAGE_DIR`, `SMTP_*` (opcional) `REMINDER_INTERVAL_MS` (intervalo dos lembretes automáticos), `TRUST_PROXY` e `COOKIE_SECURE`. O passo a passo de publicação está em `docs/DEPLOY.md`.

## Observação sobre o caso de uso 6.20 (US020)

O documento lista um "Caso de Uso [US020]" sem conteúdo. Como os requisitos vão de US001 a US019, a sugestão é remover a seção 6.20 do sumário e do corpo do documento.
