from node:22-alpine

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]