# Event Ticket Management System

Full-stack web application for the complete event ticketing lifecycle: creation → booking → payment → QR check-in.

## Features

| Phase | Status |
|---|---|
| Authentication & User Management | ✅ Done (Phase 1) |
| Event & Ticket Type Management | ✅ Done — API + web browse/detail (Phase 2) |
| Booking & Payment (Stripe) | ✅ Done — backend API (Phase 3); booking UI next |
| QR Check-In System | ⬜ Phase 4 |
| Cancellation, Refund & Waitlist | ⬜ Phase 5 |
| Analytics & Admin Panel | ⬜ Phase 6 |
| Infrastructure & DevOps | 🔄 Phase 7 — CI (lint/build/docker) green; tests pending |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Nest.js + TypeORM + PostgreSQL |
| Frontend | Next.js 16 + Shadcn/UI + Tailwind CSS |
| Queue | Redis + BullMQ |
| Payment | Stripe (VND, test mode) |
| Storage | Cloudinary |
| Auth | JWT (access 15m / refresh 7d) + Google OAuth 2.0 |
| Email | MailDev (dev) / Resend (prod) |
| Deploy | Docker + GitHub Actions |

## Quick Start

### Prerequisites

- Docker Desktop running
- Node.js 20+
- npm 9+

### 1. Clone & configure

```bash
git clone <repo-url>
cd event-ticket-system
cp apps/api/env-example-relational apps/api/.env
```

Edit `apps/api/.env` — minimum required changes:
- `AUTH_JWT_SECRET` — any random string
- `AUTH_REFRESH_SECRET` — any random string

### 2. Start infrastructure

```bash
docker compose up -d postgres redis maildev adminer
```

> **Note:** If port 5432 is in use by a local PostgreSQL, set `DATABASE_PORT=5433` in the root `.env` and `apps/api/.env`. See [Setup Guide](docs/SETUP.md#port-conflicts).

### 3. Setup & run API

```bash
cd apps/api
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev
```

### 4. Setup & run Web (new terminal)

```bash
cd apps/web
npm install
npm run dev
```

## URLs (local dev)

| Service | URL | Notes |
|---|---|---|
| API (Swagger) | http://localhost:3000/docs | Auto-generated |
| Web App | http://localhost:3001 | |
| Adminer (DB UI) | http://localhost:8080 | DB: `event_ticket_db` |
| MailDev | http://localhost:1080 | Catch all outgoing emails |

## Project Structure

```
event-ticket-system/
├── apps/
│   ├── api/          — Nest.js backend (brocoders/nestjs-boilerplate base)
│   │   ├── src/
│   │   │   ├── auth*/        — JWT + Google/Apple/Facebook OAuth
│   │   │   ├── users/        — User management
│   │   │   ├── roles/        — Role-based access control
│   │   │   ├── session/      — Refresh token sessions
│   │   │   ├── files/        — File upload (local/S3/Cloudinary)
│   │   │   ├── mail/         — Email templates
│   │   │   └── database/     — Migrations, seeds
│   │   └── test/
│   └── web/          — Next.js 16 frontend (App Router)
│       ├── app/
│       ├── components/
│       └── lib/
├── docs/
│   ├── SPEC.md       — Product specification & acceptance criteria
│   ├── SETUP.md      — Detailed setup & troubleshooting
│   ├── ARCHITECTURE.md — System architecture overview
│   └── CONTRIBUTING.md — Development workflow & conventions
├── AGENTS.md         — AI agent guide
└── docker-compose.yaml
```

## Documentation

| Doc | Description |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Product spec — user stories, acceptance criteria, API surface |
| [docs/SETUP.md](docs/SETUP.md) | Setup guide — prerequisites, install steps, troubleshooting |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture — modules, DB schema, auth flow, queue design |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Contributing — branching, commits, PR flow, code generation |
| [AGENTS.md](AGENTS.md) | AI agent guide — patterns, conventions for AI-assisted development |

## Team

HCMUS — CNPM Project, HK2 2025–2026.
