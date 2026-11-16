# ---- build: gera os arquivos estáticos do React ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vazio = a API fica no mesmo endereço do site (o nginx encaminha /api para o backend).
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- runtime: nginx servindo o site e encaminhando a API ----
FROM nginx:1.27-alpine
# O nginx troca ${BACKEND_URL} e ${PORT} no template ao iniciar (Render e Railway definem PORT).
ENV BACKEND_URL=http://backend:3333 \
    PORT=80
COPY nginx/templates /etc/nginx/templates
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:${PORT}/ >/dev/null || exit 1
