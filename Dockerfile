FROM node:18-alpine

WORKDIR /usr/src/app

# Instala dependências do sistema (opcional, útil p/ bcrypt etc.)
RUN apk add --no-cache python3 make g++ bash

# Copia apenas manifests para cache de deps
COPY package*.json ./

RUN npm ci --omit=dev

# Para ambiente de DEV usaremos bind-mount + npm i (dev) via compose
# Copia o resto dos fontes para build de PROD
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["npm","start"]
