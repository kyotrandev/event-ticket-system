# Setup Guide

Complete setup instructions for development.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | Latest | https://docs.docker.com/get-docker/ |
| Node.js | 20+ | https://nodejs.org |
| npm | 9+ | Bundled with Node |
| Git | Any | https://git-scm.com |

Optional but useful:
- `psql` CLI — for DB debugging
- `redis-cli` — for Redis debugging

---

## Method 1: Infrastructure via Docker, code runs locally (recommended for dev)

This is the fastest iteration loop — Docker handles Postgres/Redis/Mail, you run the Node apps directly.

### Step 1 — Clone

```bash
git clone <repo-url>
cd event-ticket-system
```

### Step 2 — Configure environment

```bash
cp apps/api/env-example-relational apps/api/.env
```

Edit `apps/api/.env`. Minimum to change:

```env
AUTH_JWT_SECRET=change_me_any_random_string
AUTH_REFRESH_SECRET=change_me_different_random_string
AUTH_FORGOT_SECRET=change_me_another_random_string
AUTH_CONFIRM_EMAIL_SECRET=change_me_yet_another
```

Leave everything else at defaults for local development.

### Step 3 — Start infrastructure

```bash
docker compose up -d postgres redis maildev adminer
```

Verify health:
```bash
docker compose ps
# postgres and redis should show "(healthy)"
```

### Step 4 — Install API dependencies

```bash
cd apps/api
npm install
```

### Step 5 — Run migrations & seed

```bash
npm run migration:run
npm run seed:run:relational
```

Seed creates:
- Admin user: `admin@example.com` / `secret`
- Regular user: `john.doe@example.com` / `secret`

### Step 6 — Start API

```bash
npm run start:dev
# Listening at http://localhost:3000
# Swagger: http://localhost:3000/docs
```

### Step 7 — Start Web (new terminal)

```bash
cd apps/web
npm install
npm run dev
# http://localhost:3001
```

---

## Method 2: Full Docker Compose

Runs everything in containers — closer to production but slower rebuild on code changes.

```bash
docker compose up -d
```

Rebuild after code changes:
```bash
docker compose up -d --build api
```

---

## Port Reference

| Service | Default Port | Container Name |
|---|---|---|
| API | 3000 | event-ticket-system-api-1 |
| Web | 3001 | event-ticket-system-web-1 |
| PostgreSQL | 5432 | event-ticket-system-postgres-1 |
| Redis | 6379 | event-ticket-system-redis-1 |
| MailDev (UI) | 1080 | event-ticket-system-maildev-1 |
| MailDev (SMTP) | 1025 | |
| Adminer | 8080 | event-ticket-system-adminer-1 |

---

## Troubleshooting

### Port conflicts

**Symptom:** `error: role "root" does not exist` or `Connection refused` on port 5432.

**Cause:** Local PostgreSQL is already running on port 5432. The API connects to the local instance (which has no `root` user) instead of Docker.

**Fix:**
1. Create a root-level `.env` file:
   ```env
   DATABASE_PORT=5433
   DATABASE_USERNAME=root
   DATABASE_PASSWORD=secret
   DATABASE_NAME=event_ticket_db
   ```

2. Update `apps/api/.env`:
   ```env
   DATABASE_PORT=5433
   ```

3. Restart postgres:
   ```bash
   docker compose down postgres
   docker compose up -d postgres
   ```

4. Verify:
   ```bash
   PGPASSWORD=secret psql -h localhost -p 5433 -U root -d event_ticket_db -c "SELECT 1"
   ```

---

### Migration errors

**`relation "X" does not exist`** — Missing migration. Run:
```bash
cd apps/api && npm run migration:run
```

**`already exists`** — DB has stale schema. Drop and re-run:
```bash
npm run schema:drop
npm run migration:run
npm run seed:run:relational
```

**`connection refused`** — Postgres not started or wrong port. Check `docker compose ps`.

---

### Generating new resources

Scaffold a new module (creates controller, service, DTOs, entity, migration):
```bash
cd apps/api
npm run generate:resource:relational
# Prompts for resource name (e.g. "event")
```

Generate a TypeORM migration after changing an entity:
```bash
npm run migration:generate -- --name=AddEventTable
```

---

## Environment Variables Reference

All variables live in `apps/api/.env`. Full list with descriptions:

### App

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | |
| `APP_PORT` | `3000` | |
| `API_PREFIX` | `api` | URL prefix → `/api/v1/...` |
| `APP_FALLBACK_LANGUAGE` | `en` | |

### Database

| Variable | Example | Description |
|---|---|---|
| `DATABASE_TYPE` | `postgres` | |
| `DATABASE_HOST` | `localhost` | |
| `DATABASE_PORT` | `5432` | Change to `5433` if conflict |
| `DATABASE_USERNAME` | `root` | Must match Docker `POSTGRES_USER` |
| `DATABASE_PASSWORD` | `secret` | Must match Docker `POSTGRES_PASSWORD` |
| `DATABASE_NAME` | `event_ticket_db` | |

### Auth

| Variable | Notes |
|---|---|
| `AUTH_JWT_SECRET` | Must be set, any random string |
| `AUTH_JWT_TOKEN_EXPIRES_IN` | Default `15m` |
| `AUTH_REFRESH_SECRET` | Must be set, different from JWT secret |
| `AUTH_REFRESH_TOKEN_EXPIRES_IN` | Default `7d` |
| `GOOGLE_CLIENT_ID` | Optional — only needed for Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional |

### File Storage

| Variable | Options |
|---|---|
| `FILE_DRIVER` | `local` (dev default), `s3`, `cloudinary` |

### Mail

| Variable | Dev default |
|---|---|
| `MAIL_HOST` | `localhost` |
| `MAIL_PORT` | `1025` (MailDev SMTP) |

### Payment

| Variable | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` for dev |
| `STRIPE_WEBHOOK_SECRET` | Needed for webhook validation |

### QR

| Variable | Notes |
|---|---|
| `QR_HMAC_SECRET` | Random string, used to sign QR codes |
