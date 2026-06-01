# Architecture

System design reference for the Event Ticket Management System.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Mobile                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / HTTPS
┌────────────────────────▼────────────────────────────────────┐
│                  Next.js Frontend (port 3001)                │
│              App Router + Shadcn/UI + Tailwind               │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API calls
┌────────────────────────▼────────────────────────────────────┐
│                  Nest.js API (port 3000)                     │
│            /api/v1/... + Swagger at /docs                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth  │  Users  │  Events  │  Bookings  │  Tickets  │   │
│  └────┬───┴────┬────┴─────┬────┴─────┬──────┴─────┬────┘   │
│       │        │           │          │             │        │
│  ┌────▼────────▼───────────▼──────────▼─────────────▼────┐  │
│  │              TypeORM (Repository layer)                │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
┌────────▼────────┐ ┌───────▼──────┐ ┌────────▼────────┐
│   PostgreSQL    │ │    Redis     │ │   Cloudinary    │
│  (port 5432)    │ │  (port 6379) │ │   (file CDN)    │
│  Primary DB     │ │  Cache+Queue │ │                 │
└─────────────────┘ └──────────────┘ └─────────────────┘
                            │
                    ┌───────▼───────┐
                    │  BullMQ       │
                    │  Workers      │
                    │ (email, PDF)  │
                    └───────────────┘
```

---

## Backend Architecture (Nest.js)

Built on [brocoders/nestjs-boilerplate](https://github.com/brocoders/nestjs-boilerplate) — hexagonal / clean architecture.

### Module Structure

```
src/
├── app.module.ts           — Root module, wires everything
├── main.ts                 — Bootstrap, Swagger setup, CORS
│
├── auth/                   — Email/password auth, JWT, sessions
├── auth-google/            — Google OAuth (token-exchange flow)
├── auth-apple/             — Apple OAuth
├── auth-facebook/          — Facebook OAuth
│
├── users/                  — User CRUD, profile management
│   ├── domain/             — User entity (pure domain, no ORM)
│   ├── dto/                — Request/response DTOs
│   └── infrastructure/
│       └── persistence/    — TypeORM UserEntity + UserRepository
│
├── roles/                  — RoleEnum, RolesGuard, @Roles() decorator
├── session/                — Refresh token session storage
├── statuses/               — StatusEnum (active, inactive, etc.)
│
├── files/                  — File upload (local/S3/Cloudinary drivers)
├── mail/                   — Transactional email templates
├── mailer/                 — Nodemailer dispatch service
│
├── database/
│   ├── data-source.ts      — TypeORM DataSource config
│   ├── migrations/         — SQL migrations (versioned)
│   └── seeds/
│       └── relational/     — Seed data for dev/test
│
├── config/                 — App-wide configuration (validated with Joi)
├── utils/                  — Pagination, transformers, helpers
└── i18n/                   — Translation files (en, es, fr, ar, zh, hi, uk)
```

### Hexagonal Pattern (per domain module)

```
users/
├── domain/
│   └── user.ts             — Pure domain object (no decorators)
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── infrastructure/
│   └── persistence/
│       ├── relational/
│       │   ├── entities/user.entity.ts   — TypeORM @Entity
│       │   ├── mappers/user.mapper.ts    — Entity ↔ Domain
│       │   └── repositories/user.repository.ts
│       └── user-abstract.repository.ts  — Port (interface)
├── users.controller.ts
├── users.service.ts
└── users.module.ts
```

---

## Authentication & Authorization

### JWT Flow

```
POST /api/v1/auth/email/login
  → Returns { token, refreshToken, tokenExpires }

  token: JWT, expires in 15m
  refreshToken: opaque UUID stored in DB session table

POST /api/v1/auth/refresh  (Bearer: refreshToken)
  → New { token, refreshToken, tokenExpires }
  → Old refreshToken invalidated (rotation)

POST /api/v1/auth/logout
  → Deletes session from DB
```

### Google OAuth Flow (token-exchange)

```
1. Frontend: user clicks "Login with Google"
2. Frontend: Google SDK returns idToken (client-side)
3. Frontend → API: POST /api/v1/auth/google/login { idToken }
4. API: verify idToken with Google
5. API: find or create user
6. API → Frontend: { token, refreshToken }
```

No redirect involved — cleaner for SPA/App Router.

### Role Hierarchy

```
Admin (1)      — full system access
Organizer (2)  — manage own events
Staff (3)      — check-in only
Customer (4)   — default on register, browse & book
```

Guards: `JwtAuthGuard` (authentication) + `RolesGuard` (authorization).

---

## Database Schema

### Core Tables

```
users
  id, email, password (hashed), firstName, lastName
  roleId → roles(id)
  statusId → statuses(id)
  createdAt, updatedAt, deletedAt

sessions
  id, userId → users(id)
  hash (refreshToken hash)
  createdAt

files
  id, path

roles       — (1=admin, 2=organizer, 3=staff, 4=customer)
statuses    — (1=active, 2=inactive)
```

### Domain Tables (Phase 2+, to be migrated)

```
events
  id, organizerId → users(id)
  title, description, bannerImageId → files(id)
  startDate, endDate, venue, status
  createdAt, updatedAt

ticket_types
  id, eventId → events(id)
  name, price, totalQuantity, remainingQuantity

bookings
  id, customerId → users(id)
  eventId → events(id)
  status (pending, confirmed, cancelled)
  stripePaymentIntentId
  createdAt

booking_items
  id, bookingId → bookings(id)
  ticketTypeId → ticket_types(id)
  quantity, unitPrice

tickets
  id, bookingItemId → booking_items(id)
  qrCode (signed HMAC)
  status (valid, used, cancelled)

check_in_logs
  id, ticketId → tickets(id)
  staffId → users(id)
  checkedInAt
```

---

## Queue Architecture (BullMQ + Redis)

Workers process async jobs: email dispatch, PDF ticket generation, Stripe webhook events.

```
Producer (API)           Redis (BullMQ)          Worker (API)
     │                       │                       │
     ├─ queue.add(job) ──►  [job queue]  ──────────► │
     │                       │               process(job)
     │                       │                   send email
     │                       │                   generate PDF
     │                       │                   update DB
```

Queue names (planned):
- `mail` — transactional emails
- `pdf` — ticket PDF generation
- `webhook` — Stripe webhook processing

---

## File Storage Drivers

Configured via `FILE_DRIVER` env var. Switchable without code changes:

| Driver | Use case | Config vars |
|---|---|---|
| `local` | Development | None — files in `/public/uploads` |
| `s3` | Production (AWS) | `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_DEFAULT_S3_BUCKET` |
| `cloudinary` | Production (CDN) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

---

## Frontend Architecture (Next.js 16)

App Router structure:

```
app/
├── layout.tsx              — Root layout (fonts, providers)
├── page.tsx                — Home / landing page
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── events/
│   ├── page.tsx            — Event listing
│   └── [id]/page.tsx       — Event detail + booking form
├── bookings/
│   └── page.tsx            — My bookings
└── (organizer)/
    ├── events/
    │   ├── new/page.tsx
    │   └── [id]/edit/page.tsx
    └── dashboard/page.tsx

components/
├── ui/                     — Shadcn primitives (Button, Input, etc.)
├── events/                 — EventCard, EventList, EventForm
├── bookings/               — BookingSummary, TicketItem
└── auth/                   — LoginForm, RegisterForm

lib/
├── api.ts                  — Axios/fetch client, auth interceptors
└── utils.ts                — cn(), formatCurrency(), etc.
```

### State & Data Fetching

- Server Components for data fetching where possible
- Client Components only for interactive UI
- No global state library — use React Context for auth session only

---

## CI/CD

```
Push to main
  └─► GitHub Actions
        ├─ lint + test (npm run lint && npm run test)
        ├─ build Docker images
        ├─ push to GHCR
        └─ deploy to VPS (docker compose pull && docker compose up -d)
```

Workflow files: `.github/workflows/`
