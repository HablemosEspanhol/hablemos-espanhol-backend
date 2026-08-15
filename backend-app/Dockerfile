# --- ESTÁGIO 1: Build da aplicação ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./

# Usa cache do npm para economizar I/O no disco mecânico
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build

# --- ESTÁGIO 2: Imagem final de execução ---
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

RUN mkdir -p /app/data && chown -R node:node /app

COPY package*.json ./

# Instala estritamente as dependências de produção (express, mysql2, etc.)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copia apenas os arquivos transpilados pelo tsc do primeiro estágio
COPY --from=builder /app/dist ./dist

# Segurança: Executa como usuário não-root
USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]