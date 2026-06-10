# Demo & Testing Guide

| Env | Web | API | Swagger | Mailbox (dev) |
|---|---|---|---|---|
| **Production** | https://event-ticket-system.kyotran.dev | https://api.event-ticket-system.kyotran.dev/api/v1 | https://api.event-ticket-system.kyotran.dev/docs | — |
| **Local (Docker)** | http://localhost:3000 | http://localhost:4000/api/v1 | http://localhost:4000/docs | http://localhost:1080 (MailDev) |

Start local stack: `docker compose up -d --build` → wait for API to seed → open http://localhost:3000

---

## Test Accounts

All seeded accounts use password `secret` and are **email-verified + Active** after seeding.

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@example.com` | `secret` | Full platform admin |
| Customer | `john.doe@example.com` | `secret` | Booking / payment flows |
| Organizer | `organizer@example.com` | `secret` | Owns all 3 seeded events |
| Staff | `staff1@example.com` | `secret` | Alice — assign to event for check-in |
| Staff | `staff2@example.com` | `secret` | Bob — second scanner device |

Stripe test card: `4242 4242 4242 4242` · any future expiry · any CVC

> **Login requires a verified email.** Seeded accounts are pre-verified. New accounts created via `/register` start **Inactive** until the confirmation email is opened — locally that mail lands in **MailDev (http://localhost:1080)**, not a real inbox. See Flow 0.

---

## UI Pages

### Public (no login required)

| Page | URL | What to test |
|---|---|---|
| Home | `/` | Event listing, live keyword search (case-insensitive), category & date filter |
| Event detail | `/events/[id]` | Ticket type list, price, availability counter, "Book" / "Join waitlist" |

### Auth & account

| Page | URL | What to test |
|---|---|---|
| Login | `/login` | Email+password; Google OAuth button; verified-email gate |
| Register | `/register` | New customer; organizer account (role selector → Pending Approval) |
| Confirm email | `/confirm-email` | Lands here from the verification link (MailDev locally) |
| Forgot password | `/forgot-password` | Request reset link (delivered via MailDev locally) |
| Reset password | `/reset-password` | Set new password from emailed token |
| Profile | `/profile` | Update name / phone / company; change password |

### Customer flows

| Page | URL | What to test |
|---|---|---|
| Browse events | `/events` | Keyword search, category filter, pagination |
| Book tickets | `/events/[id]` → "Book" | Select ticket qty, apply promo code, confirm booking (seat lock) |
| Payment | `/bookings/[id]/pay` | Stripe card form — use test card above |
| Confirmation | `/bookings/[id]/success` | Booking confirmed, QR ticket link |
| My bookings | `/my-bookings` | List bookings, cancel a booking (triggers refund) |
| My tickets | `/my-tickets` | QR code per ticket, download |
| My waitlist | `/my-waitlist` | Waitlist entries for sold-out tickets; promotion notice |

### Staff / Check-in  (Staff role scans; Organizer/Admin view logs)

| Page | URL | What to test |
|---|---|---|
| QR scanner | `/checkin/[eventId]` | Camera opens, scan a QR from `/my-tickets`; manual code entry |
| Check-in logs | `/checkin/[eventId]/logs` | Live log of all scan events (organizer/admin only) |

### Organizer

| Page | URL | What to test |
|---|---|---|
| My events | `/organizer/events` | List events owned by this organizer |
| Create event | `/organizer/events/create` | New event (starts as draft → publish) |
| Edit event | `/organizer/events/[id]/edit` | Update details, publish/unpublish |
| Ticket types | `/organizer/events/[id]/ticket-types` | List / create / edit / delete ticket tiers + quota |
| Assign staff | `/organizer/events/[id]/staff` | Add staff accounts allowed to scan this event |
| Analytics | `/organizer/events/[id]/analytics` | Revenue chart, sales by ticket type, refund summary |

### Admin panel

| Page | URL | What to test |
|---|---|---|
| Stats dashboard | `/admin/stats` | Platform KPIs: total revenue, bookings, users |
| User management | `/admin/users` | Lock / unlock accounts; search by email |
| Pending organizers | `/admin/organizers/pending` | Approve / reject organizer registration requests |
| Promo codes | `/admin/promo-codes` | Create discount codes (% or fixed VND), usage limit, edit |

---

## End-to-End Test Flows

### Flow 0 — Register & verify email  *(local only)*

1. Go to `/register`, create a customer account
2. Try `/login` → blocked with **"verify your email"** (account is Inactive)
3. Open **MailDev http://localhost:1080**, open the confirmation email, click the link
4. Lands on `/confirm-email` → account now Active → login succeeds
   - *Shortcut for demos:* use a pre-seeded account instead (already verified)

### Flow 1 — Full booking & payment

1. Login as customer (`john.doe@example.com` / `secret`)
2. Go to `/events`, pick a seeded event (e.g. *Synthwave Nights 2026*)
3. Click "Book Tickets", select quantity (inventory locks during checkout)
4. Optionally enter a promo code (create one first — Flow 5)
5. Confirm → redirected to `/bookings/[id]/pay`
6. Enter Stripe test card `4242 4242 4242 4242`, any future expiry / CVC
7. Submit → `/bookings/[id]/success`
8. Open `/my-tickets` → QR code per ticket

### Flow 2 — QR check-in  *(staff scans)*

1. As **organizer**, open `/organizer/events/[id]/staff` and assign `staff1@example.com`
2. Complete Flow 1 as a customer to produce a QR ticket; keep `/my-tickets` open
3. In another tab/device, login as **staff** (`staff1@example.com`) → `/checkin/[eventId]`
4. Allow camera access, scan the QR (or use manual code entry)
5. Green flash = valid; scanning again = "already checked in"
6. As **organizer/admin**, open `/checkin/[eventId]/logs` for scan history

### Flow 3 — Cancel & refund

1. Login as customer → `/my-bookings`
2. Find a paid booking, click "Cancel" → confirm
3. Booking status → "Cancelled"; Stripe refund auto-initiated (visible in Stripe test dashboard)

### Flow 4 — Organizer approval

1. Register a new account with role **Organizer** → status Pending Approval
2. Login as **admin** → `/admin/organizers/pending` → approve
3. Login as that organizer → `/organizer/events` now accessible

### Flow 5 — Promo code

1. Login as **admin** → `/admin/promo-codes` → create `DEMO20`, 20% discount, set usage limit
2. Login as customer, start a booking, enter `DEMO20` in promo field
3. Total drops before payment

### Flow 6 — Waitlist (sold out)

1. As **organizer**, set a ticket type quota low (or use one already sold out)
2. As **customer**, on a sold-out ticket click "Join waitlist"
3. Entry appears in `/my-waitlist`
4. Free up a seat (cancel a booking) → next person in line is notified (MailDev) and promoted

### Flow 7 — Organizer event lifecycle

1. Login as **organizer** → `/organizer/events/create` → fill details (draft)
2. `/organizer/events/[id]/ticket-types` → add 1–2 tiers with price + quota
3. Publish the event → now visible on public `/events`
4. Assign staff (Flow 2 step 1), then check `/organizer/events/[id]/analytics` after sales

### Flow 8 — Analytics

1. Login as **organizer** → `/organizer/events/[id]/analytics` → revenue-over-time, ticket-type breakdown, refunds
2. Login as **admin** → `/admin/stats` for platform-wide totals

---

## Seed Data

Running `npm run seed:run:relational` in `apps/api` (auto-run on Docker API start) populates:

- **5 users** — admin, customer, organizer, 2 staff (all password `secret`, pre-verified)
- **Roles** — Admin (1), Customer (2), Organizer (3), Staff (4)
- **Statuses** — Active (1), Inactive (2), Pending Approval (3), Locked (4)
- **3 published events** (owned by `organizer@example.com`): *Modern Art After Dark*, *DevConf HCMC: Scaling Systems*, *Synthwave Nights 2026*
- **5 ticket types** across those events
- **0 promo codes** — create via `/admin/promo-codes` (Flow 5)

Seeds are idempotent (skip if a role's accounts already exist). To reset & reseed: drop/recreate the DB, restart the API (migrations + seed run on startup), or run `npm run schema:drop` then `npm run migration:run && npm run seed:run:relational`.
