# API SaaS (Express + Sequelize + MySQL)

Base gerada com **express-generator** e **sequelize-cli**. Stack em **JavaScript** (sem TypeScript).

## Requisitos
- Node 18+ (LTS recomendado)
- MySQL 8+ (ou compatível)
- npm 9+ (ou pnpm/yarn se preferir)
- Redis (opcional, caso use filas depois)

## Quickstart

```bash
# 1) Clonar o repositório
git clone <SEU_REPO_URL> zapai-api
cd zapai-api

# 2) Variáveis de ambiente
cp .env.example .env
# (para rodar via Docker, o compose já injeta DB_HOST=mysql etc. para o serviço api)
# garanta que models/index.js referencia ../config/config.js (não config.json)

# 3) Subir os serviços (MySQL + API)
docker compose up -d --build

# 4) Rodar migrations DENTRO do container da API
docker compose exec api npx sequelize-cli db:migrate

# 5) (Opcional) Rodar seeders DENTRO do container
docker compose exec api npx sequelize-cli db:seed:all