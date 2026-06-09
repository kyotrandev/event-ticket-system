# Task Completion

- For coding changes, run at least affected app build: `npm run build` in `apps/api` and/or `apps/web`.
- Run lint for touched app when feasible: `npm run lint`. Existing repo lint may include unrelated warnings/errors; report exact residuals if not fully clean.
- For Phase 3 changes, verify with live API/web against Docker stack when possible: browse published events, create booking, oversell failure, promo calculation, payment intent/webhook or documented Stripe limitation, expiry/job behavior.
- Before commit: `git diff --check`; inspect `git status --short`; stage only intended files. User requested commits after important tasks.