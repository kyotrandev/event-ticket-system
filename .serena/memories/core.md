# Core

- Monorepo: `apps/api` NestJS backend, `apps/web` Next.js app. Business requirements live in `docs/SPEC.md`; manual QA plan in `docs/MANUAL_TESTING_PLAN.md`; agent architecture rules in `AGENTS.md`.
- Local Docker compose commonly runs API on `http://localhost:4000`, web on `http://localhost:3000`, Maildev on `http://localhost:1080`, Postgres host port `5433`, Redis `6379`.
- Phase modules already exist beyond boilerplate: events, ticket-types, bookings, payments, tickets, check-in, waitlist, promo-codes, analytics/admin.
- Backend must follow boilerplate hexagonal style; read module-specific code before edits.

Read `mem:tech_stack` for versions/tools, `mem:suggested_commands` for practical commands, `mem:conventions` for project patterns, and `mem:task_completion` for finish checks.