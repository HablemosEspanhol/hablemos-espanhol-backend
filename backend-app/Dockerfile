FROM node:22-alpine

RUN mkdir -p /app/data

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]