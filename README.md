# Event Ticket Management System

Full-stack web application for event ticketing: creation → booking → payment → QR check-in.

## Stack

| Layer | Tech |
|---|---|
| Backend | Nest.js + TypeORM + PostgreSQL |
| Frontend | Next.js 16 + Shadcn/UI + Tailwind |
| Queue | Redis + BullMQ |
| Payment | Stripe |
| Storage | Cloudinary |
| Auth | JWT + Google OAuth |
| Deploy | Docker + GitHub Actions |

## Quick Start (Development)

```bash
# 1. Start infrastructure
docker compose up -d postgres redis maildev adminer

# 2. Setup API
cd apps/api
cp env-example-relational .env   # already done — edit values if needed
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev                # http://localhost:3000/docs

# 3. Setup Web (new terminal)
cd apps/web
npm install
npm run dev                      # http://localhost:3001
```

## Useful URLs (local dev)

| Service | URL |
|---|---|
| API (Swagger) | http://localhost:3000/docs |
| Web app | http://localhost:3001 |
| Adminer (DB UI) | http://localhost:8080 |
| MailDev (emails) | http://localhost:1080 |

## Project Structure

```
apps/
  api/    — Nest.js backend (based on brocoders/nestjs-boilerplate)
  web/    — Next.js frontend
docs/
  SPEC.md — Product specification with user stories & acceptance criteria
AGENTS.md — AI agent guide (architecture, patterns, module inventory)
docker-compose.yaml
```

## Documentation

- **Product spec:** `docs/SPEC.md`
- **AI agent guide:** `AGENTS.md`
- **API docs:** `http://localhost:3000/docs` (Swagger, auto-generated)
