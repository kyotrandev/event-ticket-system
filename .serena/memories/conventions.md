# Conventions

- Always answer this project user in Vietnamese.
- Backend modules should preserve boilerplate hexagonal layering: domain classes without TypeORM/class-validator, persistence adapters under `infrastructure/persistence/relational`, repository ports per use case.
- Protected API endpoints use `AuthGuard('jwt')` and `RolesGuard`; ownership checks belong in services.
- Phase 3 inventory/payment paths must use TypeORM transactions and pessimistic locking where inventory changes.
- Stripe webhook requires raw body and signature verification before mutation; jobs/webhooks should be idempotent.
- Frontend API calls should stay centralized in `apps/web/lib/api.ts` where possible.