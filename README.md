# Event Ticket Management System

Full-stack web application for the complete event ticketing lifecycle: creation → booking → payment → QR check-in.

## Features

| Phase | Status |
|---|---|
| Authentication & User Management | ✅ Done (Phase 1) |
| Event & Ticket Type Management | ✅ Done — API + web browse/detail (Phase 2) |
| Booking & Payment (Stripe) | ✅ Done — API + booking/payment/my-tickets UI (Phase 3) |
| QR Check-In System | ✅ Done — API + web scanner/logs UI (Phase 4) |
| Cancellation, Refund & Waitlist | ✅ Done — cancel/refund API + waitlist queue + my-bookings UI (Phase 5, run migration to activate) |
| Analytics & Admin Panel | ✅ Done — event analytics API + admin panel UI (Phase 6) |
| Infrastructure & DevOps | ✅ Done — docker-compose, .env.example, CI/CD workflows (Phase 7) |

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

### Option A — Docker (recommended)

```bash
git clone <repo-url>
cd event-ticket-system
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit both files: set AUTH_JWT_SECRET, AUTH_REFRESH_SECRET, Stripe keys
docker compose up
```

All services start automatically. Migrations and seeds run on first boot.

### Option B — Local dev (without Docker)

#### 1. Configure

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit apps/api/.env: AUTH_JWT_SECRET, AUTH_REFRESH_SECRET, Stripe keys
```

#### 2. Start infrastructure

```bash
docker compose up -d postgres redis maildev
```

#### 3. Run API

```bash
cd apps/api
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev
```

#### 4. Run Web (new terminal)

```bash
cd apps/web
npm install
npm run dev
```

## URLs (local dev)

| Service | URL | Notes |
|---|---|---|
| API (Swagger) | http://localhost:4000/docs | Auto-generated |
| Web App | http://localhost:3000 | |
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
| [docs/DEMO.md](docs/DEMO.md) | Demo guide — test accounts, UI pages, end-to-end test flows |
| [AGENTS.md](AGENTS.md) | AI agent guide — patterns, conventions for AI-assisted development |

## Team

KMA — CNPM Project, HK2 2025–2026.
