# Contributing Guide

Development workflow and conventions for the Event Ticket Management System.

---

## Branch Naming

```
feature/<short-description>      — new functionality
fix/<short-description>          — bug fix
chore/<short-description>        — tooling, deps, config
docs/<short-description>         — documentation only
refactor/<short-description>     — no behavior change
```

Examples:
```
feature/event-listing-api
feature/booking-flow-ui
fix/stripe-webhook-signature
chore/upgrade-nestjs-10
docs/setup-guide
```

---

## Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

[optional body]
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

**Scopes:** `api`, `web`, `auth`, `events`, `bookings`, `tickets`, `payments`, `db`, `docker`, `ci`

Examples:
```
feat(api): add event listing endpoint with pagination
fix(auth): refresh token not rotating on concurrent requests
chore(db): add CheckInLog migration
docs(setup): document port conflict resolution
test(bookings): add e2e test for booking cancellation
```

Subject rules:
- lowercase
- present tense ("add" not "added")
- no period at end
- max 72 chars

---

## Pull Request Flow

1. Branch from `main`
2. Implement feature, write tests
3. `npm run lint && npm run test` — must pass
4. Push, open PR against `main`
5. Request review from at least 1 teammate
6. Squash merge (or merge commit for large features)

PR title = same format as commit message.

PR description template:
```
## What
Short description of what changed.

## Why
Motivation / issue link.

## How to test
Steps to verify manually.
```

---

## Code Generation

### New domain module (backend)

```bash
cd apps/api
npm run generate:resource:relational
# → prompts: resource name (singular, e.g. "event")
# → generates: entity, DTO, controller, service, repository, mapper, migration
```

### New database migration

```bash
cd apps/api
npm run migration:generate -- --name=DescribeWhatChanged
# → creates src/database/migrations/<timestamp>-DescribeWhatChanged.ts
```

Always inspect generated migration before running — auto-generated SQL can miss nullable constraints or indexes.

```bash
npm run migration:run      # apply
npm run migration:revert   # rollback last
```

### New seed

```bash
npm run seed:create:relational
# → prompts: seed name
# → creates src/database/seeds/relational/<name>/...
```

---

## Backend Conventions

### Module structure

Follow hexagonal pattern — every new domain module:

```
src/<resource>/
├── domain/<resource>.ts           — plain class, no decorators
├── dto/create-<resource>.dto.ts
├── dto/update-<resource>.dto.ts
├── infrastructure/persistence/
│   ├── relational/
│   │   ├── entities/<resource>.entity.ts   — @Entity, @Column, etc.
│   │   ├── mappers/<resource>.mapper.ts    — Entity ↔ Domain
│   │   └── repositories/<resource>.repository.ts
│   └── <resource>-abstract.repository.ts
├── <resource>.controller.ts
├── <resource>.service.ts
└── <resource>.module.ts
```

### Guard usage

```typescript
@UseGuards(AuthGuard('jwt'))           // authentication only
@UseGuards(AuthGuard('jwt'), RolesGuard)  // + authorization
@Roles(RoleEnum.organizer)
```

### DTOs

- `class-validator` decorators for validation
- `class-transformer` for serialization (`@Exclude`, `@Expose`)
- Extend `PaginationResponseDto` for paginated responses

### Error handling

- Throw `UnprocessableEntityException` for business rule violations
- Throw `NotFoundException` for missing resources
- Do not catch exceptions in service layer — let global filter handle

---

## Frontend Conventions

### Components

- Shadcn components go in `components/ui/` — do not modify them manually; regenerate with `npx shadcn-ui@latest add <component>`
- Feature components go in `components/<feature>/`
- Keep Server Components by default; add `'use client'` only when needed (event handlers, hooks)

### API calls

Use the shared client from `lib/api.ts` — it handles auth token injection and refresh.

```typescript
import { apiClient } from '@/lib/api'

const events = await apiClient.get('/api/v1/events')
```

### Styling

- Tailwind utility classes only — no custom CSS unless unavoidable
- `cn()` from `lib/utils` for conditional classes
- Color tokens from `tailwind.config.ts` — do not hardcode hex values

---

## Testing

### Backend unit tests

```bash
cd apps/api
npm run test              # all unit tests
npm run test:watch        # watch mode
npm run test:cov          # with coverage
```

Convention: test file beside source — `users.service.spec.ts` next to `users.service.ts`.

### Backend e2e tests

```bash
npm run test:e2e:relational:docker
# Spins up a test Postgres in Docker, runs all e2e, tears down
```

### Frontend

```bash
cd apps/web
npm run build             # type-check + build (CI gate)
```

---

## Environment Setup for New Teammates

1. Fork & clone
2. `cp apps/api/env-example-relational apps/api/.env`
3. Set `AUTH_JWT_SECRET`, `AUTH_REFRESH_SECRET`, `AUTH_FORGOT_SECRET`, `AUTH_CONFIRM_EMAIL_SECRET` to any random strings
4. `docker compose up -d postgres redis maildev adminer`
5. `cd apps/api && npm install && npm run migration:run && npm run seed:run:relational && npm run start:dev`
6. `cd apps/web && npm install && npm run dev`

See [SETUP.md](SETUP.md) for full details and troubleshooting.
