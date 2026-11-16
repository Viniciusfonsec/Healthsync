# ---- build: instala tudo, gera o cliente do Prisma e compila o TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate
COPY src ./src
RUN npm run build

# ---- runtime: código compilado + Prisma CLI (para aplicar as migrações ao iniciar) ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
RUN mkdir -p storage/documents && chown -R node:node storage
USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3333/health >/dev/null || exit 1
# Aplica as migrações pendentes e sobe a API (o seed das contas de demonstração roda na inicialização).
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]
