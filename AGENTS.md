# AGENTS.md — Event Ticket Management System

This file is the authoritative guide for AI agents (Claude, Copilot, etc.) working on this codebase. Read it fully before writing any code. Cross-reference `docs/SPEC.md` for business requirements.

---

## 0. Quick Context

This is a **monorepo** containing two applications:

| App | Path | Tech |
|---|---|---|
| `api` | `apps/api/` | Nest.js (based on brocoders/nestjs-boilerplate) |
| `web` | `apps/web/` | Next.js 15 App Router |

The backend scaffolding starts from [brocoders/nestjs-boilerplate](https://github.com/brocoders/nestjs-boilerplate) — a production-grade Nest.js starter with hexagonal architecture, JWT auth, sessions, roles, email, file upload, migrations, seeding, Docker, and CI built in.

**Do not reinvent what the boilerplate already provides.** Extend it.

---

## 1. Boilerplate Capabilities (what we inherit for free)

### 1.1 Authentication (`src/auth/`)

The boilerplate ships a complete auth system. **Reuse it, do not rewrite it.**

| Feature | Boilerplate endpoint | Our mapping |
|---|---|---|
| Email register | `POST /api/v1/auth/email/register` | Keep, extend with `role` field |
| Email login | `POST /api/v1/auth/email/login` | Keep |
| Email confirm | `POST /api/v1/auth/email/confirm` | Keep (advisory for CUSTOMER) |
| Forgot password | `POST /api/v1/auth/forgot/password` | Keep |
| Reset password | `POST /api/v1/auth/reset/password` | Keep |
| Refresh token | `POST /api/v1/auth/refresh` | Keep |
| Logout | `POST /api/v1/auth/logout` | Keep |
| Get me | `GET /api/v1/auth/me` | Keep |
| Update me | `PATCH /api/v1/auth/me` | Keep |
| Google OAuth | `POST /api/v1/auth/google/login` | Keep (token-exchange, not redirect) |

**Important:** The boilerplate uses a **token-exchange** pattern for Google OAuth, not a redirect. The Next.js frontend obtains a Google ID token client-side (via `@react-oauth/google`), then POSTs it to `/api/v1/auth/google/login`. The backend verifies the token with Google and returns a JWT pair. This is better for SPA architecture.

**Session-based JWT:** The boilerplate stores sessions in the database (`session` table). Each session has `sessionId + hash`. Refresh token rotation: new hash issued on each refresh, old hash invalidated. This enables multi-device logout and token revocation.

### 1.2 Roles & Authorization (`src/roles/`)

The boilerplate has a `RolesGuard` and `@Roles()` decorator. We extend the `RoleEnum` with our four roles:

```typescript
// Original boilerplate: admin=1, user=2
// Our extension:
export enum RoleEnum {
  admin = 1,
  customer = 2,
  organizer = 3,
  staff = 4,
}
```

Usage pattern (unchanged from boilerplate):
```typescript
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.organizer)
@Post()
createEvent(@Request() req, @Body() dto: CreateEventDto) {}
```

### 1.3 User Entity (`src/users/`)

The boilerplate `UserEntity` has: `id, email, password, provider, socialId, firstName, lastName, photo, role, status, createdAt, updatedAt, deletedAt`.

We extend the domain entity with:
- `name: string` (instead of firstName/lastName — use the boilerplate fields)
- `avatarUrl: string | null` (maps to `photo` relation)
- `googleId: string | null` (maps to `socialId` + `provider=google`)
- `status`: extend boilerplate `StatusEntity` to include `PENDING_APPROVAL` (id=3)

The boilerplate `StatusEntity` uses an id-based enum table (id=1 active, id=2 inactive). We add `id=3 pending_approval`, `id=4 locked`.

### 1.4 Email (`src/mail/`)

The boilerplate uses Nodemailer + Handlebars templates. We extend with our templates:
- `ticket-confirmation.hbs` — PAID booking, attach QR ticket PDF
- `event-cancellation.hbs` — event cancelled by organizer
- `waitlist-notification.hbs` — ticket available
- `organizer-approved.hbs` — organizer account approved
- `organizer-rejected.hbs` — organizer account rejected
- `event-reminder.hbs` — 24h before event

For local dev, boilerplate ships MailDev (`localhost:1080`) — all emails visible in browser without real SMTP.

### 1.5 File Upload (`src/files/`)

The boilerplate supports local and S3 upload drivers via a `FileDriver` interface. We add a **Cloudinary driver** following the same port/adapter pattern:

```
src/files/infrastructure/uploader/
  ├── local/          (boilerplate)
  ├── s3/             (boilerplate)
  └── cloudinary/     (NEW — implement CloudinaryFileUploadDriver)
```

Set `FILE_DRIVER=cloudinary` in `.env`.

### 1.6 Database & Migrations

- TypeORM with PostgreSQL
- Migrations in `src/database/migrations/`
- Generate: `npm run migration:generate -- src/database/migrations/MigrationName`
- Run: `npm run migration:run`
- Seed: `npm run seed:run:relational`
- Seeder location: `src/database/seeds/relational/`

### 1.7 Docker Compose

Boilerplate ships: `postgres`, `maildev`, `adminer`, `api`. We extend `docker-compose.yaml` with:
- `redis` (uncomment the existing commented service, configure for BullMQ)
- `web` (Next.js)
- `nginx` (reverse proxy for production)

### 1.8 Swagger

All controllers use `@ApiTags`, `@ApiBearerAuth`, `@ApiOkResponse`. Swagger UI at `http://localhost:3000/docs`. **Every new endpoint must be documented** with Swagger decorators following boilerplate patterns.

### 1.9 Pagination

Use the boilerplate's infinity pagination pattern for all list endpoints:

```typescript
// Query DTO extends InfinityPaginationQueryDto (page, limit)
// Response wraps InfinityPaginationResponseDto<T>
```

---

## 2. Architecture: Hexagonal (Ports & Adapters)

Every module follows the **hexagonal architecture** established by the boilerplate. This is non-negotiable — do not use a flat module structure.

### Folder Structure per Module

```
src/[module-name]/
├── [module-name].module.ts
├── [module-name].controller.ts
├── [module-name].service.ts
├── dto/
│   ├── create-[module-name].dto.ts
│   ├── update-[module-name].dto.ts
│   └── query-[module-name].dto.ts
├── domain/
│   └── [module-name].ts          ← pure domain entity, NO TypeORM decorators
└── infrastructure/
    └── persistence/
        └── relational/
            ├── entities/
            │   └── [module-name].entity.ts   ← TypeORM entity
            ├── mappers/
            │   └── [module-name].mapper.ts   ← domain ↔ entity
            ├── repositories/
            │   └── [module-name].repository.ts  ← adapter implements port
            └── relational-persistence.module.ts
```

### Domain Layer Rule

Domain entities (`domain/[module].ts`) must have:
- **Zero** TypeORM imports
- **Zero** class-validator imports
- Pure TypeScript classes with typed fields
- Business invariants as methods (optional)

### Repository Port Pattern

```typescript
// src/[module]/[module].repository.ts — the PORT (interface)
export abstract class EventRepository {
  abstract findById(id: Event['id']): Promise<NullableType<Event>>;
  abstract findByOrganizer(organizerId: User['id'], pagination: IPaginationOptions): Promise<Event[]>;
  abstract create(data: CreateEventDto): Promise<Event>;
  abstract update(id: Event['id'], data: Partial<Event>): Promise<Event>;
  // Avoid generic findAll/findOne with arbitrary where clauses
  // Create specific methods per use-case
}
```

```typescript
// src/[module]/infrastructure/persistence/relational/repositories/[module].repository.ts — the ADAPTER
@Injectable()
export class EventRelationalRepository implements EventRepository {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    private readonly eventMapper: EventMapper,
  ) {}
  // implement all abstract methods
}
```

### Mapper Pattern

```typescript
// [module].mapper.ts
export class EventMapper {
  static toDomain(entity: EventEntity): Event {
    const domain = new Event();
    domain.id = entity.id;
    domain.name = entity.name;
    // ... map all fields
    return domain;
  }

  static toPersistence(domain: Event): EventEntity {
    const entity = new EventEntity();
    entity.id = domain.id;
    // ...
    return entity;
  }
}
```

---

## 3. Module Inventory

### 3.1 Modules Inherited from Boilerplate (extend, do not rewrite)

| Module | What to change |
|---|---|
| `auth` | Add `role` param to register DTO; enforce ORGANIZER → PENDING_APPROVAL |
| `auth-google` | Keep as-is; Google login auto-assigns CUSTOMER role |
| `users` | Extend `StatusEntity` with pending_approval(3) + locked(4); add admin approval endpoint |
| `roles` | Add `organizer=3`, `staff=4` to `RoleEnum` and seed data |
| `statuses` | Add `pending_approval=3`, `locked=4` to seed |
| `mail` | Add new email templates (see §1.4) |
| `files` | Add Cloudinary driver (see §1.5) |
| `session` | No changes needed |

### 3.2 New Modules (build following hexagonal pattern)

Each module below must be built from scratch following §2.

---

#### Module: `events`

**Domain entity:** `Event` (all fields from SPEC §3)

**Repository methods:**
- `findById(id)`
- `findPublished(filters: EventFilters, pagination)` — for customer browse
- `findByOrganizer(organizerId, pagination)` — organizer dashboard
- `create(data)` → Event
- `update(id, data)` → Event
- `updateStatus(id, status)` → Event

**Service responsibilities:**
- CRUD with ownership check (organizer owns their events)
- Status transition validation (DRAFT → PUBLISHED requires ≥1 TicketType)
- On CANCELLED: trigger bulk refund via PaymentService, notify via MailService

**Controller:**
- Public: `GET /events`, `GET /events/:id`
- Organizer: `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`, `PATCH /events/:id/status`
- Admin: same PATCH/DELETE as organizer (no ownership check)

**Guards:** `AuthGuard('jwt')` + `RolesGuard` on write endpoints; public read endpoints have no guard.

---

#### Module: `ticket-types`

**Domain entity:** `TicketType`

**Repository methods:**
- `findByEvent(eventId)`
- `findAvailableByEvent(eventId)` — for customer view
- `findById(id)`
- `create(data)`
- `update(id, data)`
- `incrementSold(id, qty, manager: EntityManager)` — runs inside booking transaction
- `decrementSold(id, qty, manager: EntityManager)` — runs on refund/cancel

**Service responsibilities:**
- Validate saleEnd < event.startTime
- Validate totalQty change ≥ soldQty
- Auto-set status=SOLD_OUT when soldQty = totalQty

**Controller:**
- Organizer: `POST /events/:eventId/ticket-types`, `PATCH /ticket-types/:id`, `DELETE /ticket-types/:id`

---

#### Module: `bookings`

**Domain entities:** `Booking`, `BookingItem`

This is the most complex module. Contains the inventory locking logic.

**Repository methods:**
- `findById(id)`
- `findByCustomer(customerId, pagination)`
- `create(data, manager: EntityManager)` — must accept EntityManager for transaction
- `updateStatus(id, status, manager?: EntityManager)`
- `findExpiredPending()` — for expiry job

**Service: `createBooking(customerId, dto)`**
```
1. Validate event is PUBLISHED/ONGOING
2. Validate each TicketType's saleStart/saleEnd window
3. Validate total qty ≤ event.maxTicketsPerOrder
4. Validate promo code if provided (PromoCodeService.validate())
5. Open DB transaction:
   a. For each item: SELECT ticketType FOR UPDATE (pessimistic lock)
   b. Check availability: totalQty - soldQty - reservedQty ≥ requestedQty
   c. Increment reservedQty
   d. Create Booking + BookingItems
6. Enqueue expire-booking BullMQ job (delay = 15 minutes)
7. Return booking
```

**BullMQ queue: `booking-expiry`**
```typescript
// processor
async processExpiry(job: Job<{ bookingId: string }>) {
  const booking = await bookingRepo.findById(job.data.bookingId);
  if (booking.status !== BookingStatus.PENDING_PAYMENT) return; // idempotent
  // transaction: status→EXPIRED, decrement reservedQty
  // trigger waitlist check
}
```

**Controller:**
- Customer: `POST /bookings`, `GET /bookings/me`, `GET /bookings/:id`, `DELETE /bookings/:id`

---

#### Module: `payments`

**Domain entity:** `Payment`

**Stripe integration:**
```typescript
// payments.service.ts
import Stripe from 'stripe';

createPaymentIntent(booking: Booking): Promise<{ clientSecret: string }> {
  const intent = await this.stripe.paymentIntents.create({
    amount: booking.totalAmount,  // integer, VND (no decimals)
    currency: 'vnd',
    metadata: { bookingId: booking.id },
    idempotency_key: booking.id, // prevent duplicate intents
  });
  return { clientSecret: intent.client_secret };
}
```

**Webhook handler** (`POST /payments/webhook` — no auth guard, Stripe-Signature verified):
```typescript
// CRITICAL: verify signature first
const event = this.stripe.webhooks.constructEvent(
  rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET
);

switch (event.type) {
  case 'payment_intent.succeeded':
    // idempotency check: if Payment.status already PAID, skip
    // transaction: Booking→PAID, soldQty++, reservedQty--
    // create Ticket records (UUID v4 code + HMAC secret)
    // enqueue send-ticket-email job
    // write AuditLog
    break;
  case 'payment_intent.payment_failed':
    // Booking→FAILED, reservedQty--
    // trigger waitlist check
    break;
  case 'charge.refund.updated':
    // idempotent: update Payment.stripeRefundId, Payment.refundedAt
    // write AuditLog
    break;
}
```

**Raw body requirement:** Stripe webhook signature verification requires the raw request body. Configure `app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }))` in `main.ts`.

**Controller:**
- Customer: `POST /payments/intent/:bookingId`
- Public (Stripe): `POST /payments/webhook`

---

#### Module: `tickets`

**Domain entity:** `Ticket`

**QR Code generation:**
```typescript
// ticket.service.ts
import { createHmac, randomUUID } from 'crypto';
import * as QRCode from 'qrcode';

generateTicket(bookingItemId: string, eventId: string): Ticket {
  const code = randomUUID(); // UUID v4
  const qrSecret = createHmac('sha256', process.env.QR_HMAC_SECRET)
    .update(`${code}:${eventId}`)
    .digest('hex');
  // store code + qrSecret in DB
  return { code, qrSecret };
}

async getQrImage(code: string): Promise<Buffer> {
  // QR encodes: JSON.stringify({ code, sig: qrSecret })
  return QRCode.toBuffer(JSON.stringify({ code, sig: ticket.qrSecret }));
}
```

**Controller:**
- Customer: `GET /tickets/me`, `GET /tickets/:code/qr`
- Admin/Staff: `GET /tickets/:code/qr` (no ownership check)

---

#### Module: `checkin`

**Domain entity:** `CheckInLog`

**Service: `scan(staffId, { code, eventId, method })`**
```typescript
1. Verify staff is in EventStaffAssignment for eventId (403 if not)
2. Lookup Ticket by code
3. If not found → return { result: 'NOT_FOUND' }
4. If method=QR: verify HMAC signature
   - Recompute: createHmac('sha256', QR_HMAC_SECRET).update(`${code}:${eventId}`).digest('hex')
   - If mismatch → return { result: 'INVALID' }
5. Verify ticket belongs to an event booking (join through BookingItem → Booking → Event)
6. If ticket.status === USED → return { result: 'ALREADY_USED', checkedInAt, staffName }
7. If ticket.status === CANCELLED → return { result: 'INVALID' }
8. Transaction: ticket.status → USED, create CheckInLog
9. Return { result: 'VALID', attendeeName, ticketTypeName }
```

**Controller:**
- Staff: `POST /checkin/scan`, `POST /checkin/manual`
- Organizer/Admin: `GET /checkin/logs/:eventId`

---

#### Module: `waitlist`

**Domain entity:** `WaitlistEntry`

**Service: `notifyNext(ticketTypeId)`** — called after any ticket release:
```typescript
1. Find oldest WaitlistEntry with status=WAITING for ticketTypeId
2. If none → return
3. Transition to NOTIFIED, set notifiedAt=now, expiresAt=now+48h
4. Enqueue waitlist-expiry BullMQ job (delay=48h)
5. Send waitlist-notification email with booking link
```

**BullMQ queue: `waitlist-expiry`**:
```typescript
async processWaitlistExpiry(job: Job<{ entryId: string }>) {
  const entry = await waitlistRepo.findById(job.data.entryId);
  if (entry.status !== WaitlistStatus.NOTIFIED) return; // already fulfilled
  await waitlistRepo.updateStatus(entry.id, WaitlistStatus.EXPIRED);
  await this.notifyNext(entry.ticketTypeId); // cascade to next
}
```

**Controller:**
- Customer: `POST /waitlist`, `DELETE /waitlist/:id`, `GET /waitlist/me`

---

#### Module: `promo-codes`

**Domain entity:** `PromoCode`

**Service: `validate(code, subtotalAmount)`**:
```typescript
1. Find active, non-expired promo code with usedCount < maxUses
2. Calculate discount:
   - PERCENT: Math.floor(subtotalAmount * discountValue / 100)
   - FIXED: Math.min(discountValue, subtotalAmount)
3. Return { valid: true, discountAmount }
// Increment usedCount happens inside booking transaction (pessimistic update)
```

**Controller:**
- Public: `POST /promo-codes/validate`
- Admin: `POST /admin/promo-codes`, `GET /admin/promo-codes`, `PATCH /admin/promo-codes/:id`, `DELETE /admin/promo-codes/:id`

---

#### Module: `event-staff`

**Domain entity:** `EventStaffAssignment`

Thin module — no complex business logic.

**Controller:**
- Organizer (owner): `GET /events/:id/staff`, `POST /events/:id/staff`, `DELETE /events/:id/staff/:staffId`
- Admin: same (no ownership check)

---

#### Module: `analytics`

**No domain entity** — read-only aggregation queries.

**Repository methods** (raw SQL or QueryBuilder, no domain mapper needed):
- `getEventAnalytics(eventId)` → tickets sold, revenue, check-in rate, daily breakdown
- `getSystemStats()` → user counts by role, event counts by status, revenue totals

**Controller:**
- Organizer: `GET /organizer/events/:id/analytics`, `GET /organizer/me/stats`
- Admin: `GET /admin/stats`

---

#### Module: `audit-log`

**Domain entity:** `AuditLog`

Write-only service. Called by other services; no controller endpoints.

```typescript
// audit-log.service.ts
async log(userId: string, action: string, entity: string, entityId: string, payload?: object) {
  await this.auditLogRepo.create({ userId, action, entity, entityId, payload, createdAt: new Date() });
}
```

---

## 4. BullMQ Queues Summary

| Queue name | Job | Delay | Processor location |
|---|---|---|---|
| `booking-expiry` | `expire-booking` | 15 minutes | `bookings/processors/booking-expiry.processor.ts` |
| `email` | `send-ticket-email` | 0 (immediate) | `mail/processors/send-ticket-email.processor.ts` |
| `email` | `event-reminder` | scheduled | `mail/processors/event-reminder.processor.ts` |
| `waitlist-expiry` | `expire-waitlist` | 48 hours | `waitlist/processors/waitlist-expiry.processor.ts` |

**BullMQ setup:** `@nestjs/bullmq` + Redis. Add `BullModule.forRoot({ connection: redisConfig })` to `AppModule`. Each module registers its own queue with `BullModule.registerQueue({ name: 'booking-expiry' })`.

---

## 5. Database Transactions Pattern

For operations requiring multiple table updates (booking creation, payment processing, refund), always use TypeORM `DataSource.transaction()`:

```typescript
// Inject DataSource, not individual repositories
constructor(private readonly dataSource: DataSource) {}

async createBooking(...) {
  return this.dataSource.transaction(async (manager: EntityManager) => {
    // All operations use manager.getRepository(Entity)
    const ticketTypeRepo = manager.getRepository(TicketTypeEntity);

    // Pessimistic write lock
    const ticketType = await ticketTypeRepo.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    // mutate and save within the same manager
    await ticketTypeRepo.save(ticketType);
  });
}
```

**Never use individual `@InjectRepository` repos for transactional work.** Pass `EntityManager` from the service layer down to repository methods.

---

## 6. RBAC Pattern

Every protected endpoint needs both guards. Ownership checks happen in the service layer, not the guard.

```typescript
// Pattern for organizer-owned resources:
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.organizer, RoleEnum.admin)
@Patch(':id')
async update(@Param('id') id: string, @Body() dto, @Request() req) {
  // Service checks ownership:
  const event = await this.eventsService.findById(id);
  if (event.organizerId !== req.user.id && req.user.role !== RoleEnum.admin) {
    throw new ForbiddenException();
  }
  return this.eventsService.update(id, dto);
}
```

**Organizer approval check** — add a custom guard or service method:
```typescript
// In events.service.ts createEvent():
if (user.status === StatusEnum.pending_approval) {
  throw new ForbiddenException('Account pending approval');
}
```

---

## 7. Environment Variables

```bash
# App
APP_PORT=3000
API_PREFIX=api/v1
APP_FALLBACK_LANGUAGE=en
APP_HEADER_LANGUAGE=x-custom-lang
FRONTEND_DOMAIN=http://localhost:3001
BACKEND_DOMAIN=http://localhost:3000

# Auth
AUTH_JWT_SECRET=your_jwt_secret
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=your_refresh_secret
AUTH_REFRESH_TOKEN_EXPIRES_IN=7d

# Google OAuth
AUTH_GOOGLE_CLIENT_ID=
AUTH_GOOGLE_CLIENT_SECRET=

# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=secret
DATABASE_NAME=event_ticket_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# File driver
FILE_DRIVER=cloudinary   # local | s3 | cloudinary

# Email
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_IGNORE_TLS=true
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false
MAIL_DEFAULT_EMAIL=noreply@eventticket.dev
MAIL_DEFAULT_NAME=EventTicket

# QR
QR_HMAC_SECRET=your_qr_hmac_secret_min_32_chars
```

---

## 8. Project Folder Structure

```
event-ticket-system/
├── apps/
│   ├── api/                          ← Nest.js (based on nestjs-boilerplate)
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   │
│   │   │   ├── auth/                 ← boilerplate (extend)
│   │   │   ├── auth-google/          ← boilerplate (keep as-is)
│   │   │   ├── users/                ← boilerplate (extend status enum)
│   │   │   ├── roles/                ← boilerplate (add organizer, staff)
│   │   │   ├── statuses/             ← boilerplate (add pending_approval, locked)
│   │   │   ├── session/              ← boilerplate (no changes)
│   │   │   ├── mail/                 ← boilerplate (add templates)
│   │   │   ├── files/                ← boilerplate (add cloudinary driver)
│   │   │   ├── config/               ← boilerplate (add stripe, cloudinary, redis configs)
│   │   │   │
│   │   │   ├── events/               ← NEW (hexagonal)
│   │   │   ├── ticket-types/         ← NEW (hexagonal)
│   │   │   ├── bookings/             ← NEW (hexagonal + BullMQ)
│   │   │   ├── payments/             ← NEW (Stripe)
│   │   │   ├── tickets/              ← NEW (QR generation)
│   │   │   ├── checkin/              ← NEW
│   │   │   ├── waitlist/             ← NEW (hexagonal + BullMQ)
│   │   │   ├── promo-codes/          ← NEW (hexagonal)
│   │   │   ├── event-staff/          ← NEW (thin)
│   │   │   ├── analytics/            ← NEW (read-only)
│   │   │   └── audit-log/            ← NEW (write-only)
│   │   │
│   │   ├── test/                     ← e2e tests
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          ← Next.js 15 App Router
│       ├── app/
│       │   ├── (public)/             ← unauthenticated pages
│       │   │   ├── events/           ← browse + detail
│       │   │   └── auth/             ← login, register
│       │   ├── (customer)/           ← customer dashboard
│       │   │   ├── bookings/
│       │   │   ├── tickets/
│       │   │   └── waitlist/
│       │   ├── (organizer)/          ← organizer dashboard
│       │   │   ├── events/
│       │   │   └── analytics/
│       │   ├── (staff)/              ← check-in page
│       │   │   └── checkin/
│       │   └── (admin)/              ← admin panel
│       │       ├── users/
│       │       └── stats/
│       ├── components/
│       │   ├── ui/                   ← Shadcn/UI components
│       │   └── features/             ← feature-specific components
│       ├── lib/
│       │   ├── api.ts                ← typed API client (fetch wrapper)
│       │   └── auth.ts               ← NextAuth or custom session
│       ├── Dockerfile
│       └── package.json
│
├── docs/
│   └── SPEC.md
│
├── docker-compose.yaml               ← dev environment
├── docker-compose.prod.yaml          ← production
├── .github/
│   └── workflows/
│       ├── lint-test.yml             ← PR checks
│       └── deploy.yml                ← CD on main
└── AGENTS.md                         ← this file
```

---

## 9. Frontend Architecture (Next.js)

### Route Groups & Layout

Use Next.js 15 route groups for role-based layouts:

```
app/(public)/        → public layout (navbar only)
app/(customer)/      → customer layout (requires CUSTOMER role)
app/(organizer)/     → organizer layout (requires ORGANIZER + ACTIVE status)
app/(staff)/         → staff layout (requires STAFF role)
app/(admin)/         → admin layout (requires ADMIN role)
```

Each group has a `layout.tsx` that checks auth and redirects unauthorized users.

### API Client

Centralize all API calls in `lib/api.ts`:

```typescript
// lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

### QR Scanner (Check-In Page)

```typescript
// app/(staff)/checkin/[eventId]/page.tsx
// Use jsQR library:
import jsQR from 'jsqr';

// Canvas + requestAnimationFrame loop
// On decode: POST /api/v1/checkin/scan { code: parsedCode, eventId }
// Display result with color-coded badge (green VALID / red INVALID+USED)
```

### Stripe Integration

```typescript
// app/(customer)/bookings/[id]/payment/page.tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// 1. Fetch clientSecret from POST /payments/intent/:bookingId
// 2. Render <Elements stripe={stripePromise} options={{ clientSecret }}>
// 3. On submit: stripe.confirmPayment({ elements, confirmParams: { return_url } })
```

### Cloudinary Upload (Event Banner)

Frontend uploads directly to Cloudinary before form submit:
```typescript
// Use Cloudinary's unsigned upload or signed upload preset
// Result: { secure_url, public_id }
// Submit secure_url as bannerUrl in event form
```

---

## 10. CI/CD Pipeline

### `.github/workflows/lint-test.yml` (PR checks)

```yaml
on: [pull_request]
jobs:
  api:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
      redis:
        image: redis:7-alpine
    steps:
      - checkout
      - setup-node (v22)
      - npm ci (in apps/api)
      - npm run lint
      - npm run test
      - npm run test:e2e
  web:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node (v22)
      - npm ci (in apps/web)
      - npm run lint
      - npm run build
```

### `.github/workflows/deploy.yml` (CD on main)

```yaml
on:
  push:
    branches: [main]
jobs:
  build-push:
    steps:
      - Login to GHCR
      - docker build + tag with ${{ github.sha }}
      - docker push api image
      - docker push web image
  deploy:
    needs: build-push
    steps:
      - SSH to VPS
      - docker compose pull
      - docker compose up -d
```

---

## 11. Key Patterns & Conventions

### DTO Validation

All request bodies validated with `class-validator`:
```typescript
import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsDateString()
  startTime: Date;
  // ...
}
```

Global `ValidationPipe` is already configured in the boilerplate's `main.ts`.

### Error Handling

Use Nest.js built-in HTTP exceptions. Do not throw generic `Error`:
```typescript
throw new NotFoundException('Event not found');
throw new ForbiddenException('Not assigned to this event');
throw new BadRequestException('Only N tickets remaining');
throw new ConflictException('Email already in use');
```

Global exception filter is already set up in the boilerplate.

### Serialization

Use `@SerializeOptions` for controlling response shape (boilerplate pattern):
```typescript
@SerializeOptions({ groups: ['organizer'] })  // hide sensitive fields for customers
```

Define `@Expose()` on domain entity fields with groups.

### Transactions in Tests

E2E tests should use `DataSource.query('BEGIN')` / `ROLLBACK` or truncate tables in `beforeEach` to isolate test state.

### Idempotency

Every webhook handler and BullMQ job processor must check current state before acting:
```typescript
// Always check before mutating
const booking = await repo.findById(id);
if (booking.status !== BookingStatus.PENDING_PAYMENT) {
  return; // already processed, skip silently
}
```

---

## 12. Development Workflow

```bash
# Initial setup (run once)
cd apps/api
cp env-example-relational .env    # edit values
npm install
npm run app:config                # boilerplate config wizard

# Start infrastructure
docker compose up -d postgres redis maildev adminer

# Run migrations + seeds
npm run migration:run
npm run seed:run:relational       # creates admin user + sample roles/statuses

# Start dev servers
cd apps/api && npm run start:dev  # http://localhost:3000
cd apps/web && npm run dev        # http://localhost:3001

# Useful URLs
# Swagger:  http://localhost:3000/docs
# Adminer:  http://localhost:8080  (postgres)
# MailDev:  http://localhost:1080  (all emails)
```

### Adding a New Module

```bash
cd apps/api
# Use boilerplate CLI generator:
npm run generate:resource:relational
# Follow prompts to scaffold hexagonal structure
# Then: add business logic, guards, BullMQ if needed
```

### Migration workflow

```bash
# After modifying an entity:
npm run migration:generate -- src/database/migrations/AddEventTable
npm run migration:run
```

---

## 13. Critical Invariants (enforcement checklist)

When implementing any booking/payment/checkin code, verify these six constraints hold:

- [ ] **No overselling**: `SELECT ... FOR UPDATE` on TicketType before incrementing reservedQty. Check `totalQty - soldQty - reservedQty ≥ requested` inside the lock.
- [ ] **One check-in per ticket**: Check `ticket.status === ISSUED` before setting `USED`. Never create a second `CheckInLog` for a `USED` ticket.
- [ ] **Booking expiry is idempotent**: Expiry job checks `booking.status === PENDING_PAYMENT` before transitioning. Safe to run multiple times.
- [ ] **QR integrity**: HMAC-SHA256 verification on every QR scan. Reject mismatches before any DB lookup.
- [ ] **RBAC on all writes**: Every non-public endpoint has `AuthGuard('jwt')` + `RolesGuard`. Ownership check in service layer for organizer-owned resources.
- [ ] **Webhook idempotency**: Check `Payment.stripePaymentIntentId` uniqueness before processing `payment_intent.succeeded`. Same event ID must never generate tickets twice.

---

*Last updated: 2026-06-01. Cross-reference: `docs/SPEC.md`*
