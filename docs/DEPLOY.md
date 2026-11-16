# Publicação do HealthSync (com HTTPS)

O HealthSync roda em três peças: **PostgreSQL**, **backend** (API Fastify) e **frontend** (React servido por nginx).
O nginx do frontend também encaminha `/api`, `/health` e `/docs` para o backend, então **site e API ficam no mesmo endereço**.
Isso é necessário porque a sessão fica num cookie `httpOnly` com `SameSite=Strict`, que só é enviado para o próprio site.

```
Navegador ──HTTPS──▶ frontend (nginx) ──┬─▶ arquivos do React
                                        └─▶ /api, /health, /docs ──▶ backend :3333 ──▶ PostgreSQL :5432
```

## Antes de publicar

| Variável (backend) | O que colocar |
|---|---|
| `DATABASE_URL` | Endereço do PostgreSQL 16 |
| `JWT_SECRET` | Texto aleatório com 32+ caracteres. **Com o valor de exemplo o servidor não sobe em produção.** |
| `DOCUMENT_ENCRYPTION_KEY` | Outro texto aleatório com 32+ caracteres. Não troque depois: os anexos já gravados deixam de abrir. |
| `SEED_PASSWORD` | Senha das contas de demonstração (criadas só com o banco vazio) |
| `TRUST_PROXY` | `true` (o backend fica atrás do nginx ou do proxy do provedor) |
| `COOKIE_SECURE` | `true` (padrão em produção: o cookie só trafega por HTTPS) |
| `CORS_ORIGIN` | O endereço público do site, por exemplo `https://healthsync.exemplo.com.br` |
| `SMTP_*` | Opcional, para enviar e-mails de verdade |

Para gerar as chaves: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Opção 1: servidor próprio (VPS) com Docker e HTTPS automático

Funciona em qualquer servidor Linux com Docker (Oracle Cloud Free, DigitalOcean, AWS Lightsail…) e um domínio apontando para ele.

1. Instale o Docker e clone o repositório.
2. Crie o arquivo `.env` na raiz (ao lado do `docker-compose.yml`):

   ```env
   POSTGRES_PASSWORD=uma-senha-forte
   JWT_SECRET=<chave gerada>
   DOCUMENT_ENCRYPTION_KEY=<outra chave gerada>
   PUBLIC_URL=https://healthsync.exemplo.com.br
   HEALTHSYNC_PORT=8080
   ```

3. Suba: `docker compose up -d --build`. O backend aplica as migrações sozinho ao iniciar.
4. Coloque o HTTPS na frente com o [Caddy](https://caddyserver.com), que emite e renova o certificado automaticamente. Arquivo `/etc/caddy/Caddyfile`:

   ```
   healthsync.exemplo.com.br {
     reverse_proxy localhost:8080
   }
   ```

   Depois: `sudo systemctl reload caddy`. Pronto: `https://healthsync.exemplo.com.br`.

Atualizar: `git pull && docker compose up -d --build`. Backup do banco: `docker compose exec db pg_dump -U healthsync healthsync > backup.sql`.

## Opção 2: Render (sem servidor próprio)

O Render dá HTTPS automático em `*.onrender.com`. Crie, nesta ordem:

1. **PostgreSQL** (New → PostgreSQL, versão 16). Copie a *Internal Database URL*.
2. **Backend** (New → Web Service → este repositório):
   - Root Directory: `backend` · Runtime: **Docker**
   - Variáveis: as da tabela acima, com `DATABASE_URL` = a URL interna do passo 1, `NODE_ENV=production`, `PORT=3333`, `TRUST_PROXY=true` e `CORS_ORIGIN` = o endereço do frontend do passo 3.
   - Health Check Path: `/health`
   - Disco (Disks): monte em `/app/storage/documents` para os anexos não se perderem a cada publicação. Sem disco, os anexos somem quando o serviço reinicia.
3. **Frontend** (New → Web Service → este repositório):
   - Root Directory: `frontend` · Runtime: **Docker**
   - Variável: `BACKEND_URL` = endereço do backend, por exemplo `https://healthsync-api.onrender.com`
4. Abra o endereço do **frontend**. É ele que os usuários usam; o do backend só recebe as chamadas encaminhadas.

O Railway funciona do mesmo jeito: um serviço de PostgreSQL e dois serviços a partir das pastas `backend` e `frontend`, com as mesmas variáveis.

## Conferir depois de publicar

- `https://SEU-SITE/health` responde `{"status":"ok", "database":"postgresql"}`.
- O login funciona e, nas ferramentas do navegador (Application → Cookies), o cookie `hs_session` aparece com **HttpOnly**, **Secure** e **SameSite=Strict**.
- `https://SEU-SITE/docs` abre o Swagger.
- Troque a senha das contas de demonstração ou desative-as na área do administrador master.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Backend não sobe e o log diz "Defina JWT_SECRET e DOCUMENT_ENCRYPTION_KEY" | As chaves ainda são as de exemplo |
| Login "funciona", mas a página volta para o login | Site sem HTTPS com `COOKIE_SECURE=true`, ou site e API em endereços diferentes (o cookie não é enviado) |
| Muitos "429 Too Many Requests" | `TRUST_PROXY` não está `true`: todos os usuários parecem o mesmo IP |
| Anexo dá erro ao abrir | `DOCUMENT_ENCRYPTION_KEY` foi trocada depois do envio |
