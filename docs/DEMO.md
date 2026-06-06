# Demo & Testing Guide

Production: https://event-ticket-system.kyotran.dev | API docs: https://api.event-ticket-system.kyotran.dev/docs

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `secret` |
| Customer | `john.doe@example.com` | `secret` |
| Organizer | `organizer@example.com` | `secret` |

Stripe test card: `4242 4242 4242 4242` · any future expiry · any CVC

---

## UI Pages

### Public (no login required)

| Page | URL | What to test |
|---|---|---|
| Home | `/` | Event listing, search/filter by category & date |
| Event detail | `/events/[id]` | Ticket type list, price, availability counter |

### Auth

| Page | URL | What to test |
|---|---|---|
| Login | `/login` | Email+password login; Google OAuth button |
| Register | `/register` | New customer account; organizer account (role selector) |

### Customer flows

| Page | URL | What to test |
|---|---|---|
| Browse events | `/events` | Keyword search, category filter, pagination |
| Book tickets | `/events/[id]` → "Book" | Select ticket qty, apply promo code, confirm booking |
| Payment | `/bookings/[id]/pay` | Stripe card form — use test card above |
| Confirmation | `/bookings/[id]/success` | Booking confirmed, QR ticket link |
| My bookings | `/my-bookings` | List all bookings, cancel a booking |
| My tickets | `/my-tickets` | QR code per ticket, download |

### Staff / Check-in

| Page | URL | What to test |
|---|---|---|
| QR scanner | `/checkin/[eventId]` | Camera opens, scan a QR from `/my-tickets` |
| Check-in logs | `/checkin/[eventId]/logs` | Live log of all scan events for this event |

### Organizer

| Page | URL | What to test |
|---|---|---|
| My events | `/organizer/events` | List events owned by organizer account |
| Event analytics | `/organizer/events/[id]/analytics` | Revenue chart, ticket sales by type, refund summary |

### Admin panel

| Page | URL | What to test |
|---|---|---|
| Stats dashboard | `/admin` or `/admin/stats` | Platform KPIs: total revenue, bookings, users |
| User management | `/admin/users` | Lock / unlock user accounts; search by email |
| Pending organizers | `/admin/organizers/pending` | Approve or reject organizer registration requests |
| Promo codes | `/admin/promo-codes` | Create discount codes (% or fixed VND), set usage limit |

---

## End-to-End Test Flows

### Flow 1 — Full booking & payment

1. Login as customer (`john.doe@example.com`)
2. Go to `/events`, pick any event
3. Click "Book Tickets", select quantity
4. Optionally enter a promo code (create one first as admin)
5. Confirm → redirected to `/bookings/[id]/pay`
6. Enter Stripe test card `4242 4242 4242 4242`, any expiry/CVC
7. Submit → redirected to `/bookings/[id]/success`
8. Check `/my-tickets` for QR code

### Flow 2 — QR check-in

1. Complete Flow 1 to get a QR ticket
2. Open `/my-tickets`, display QR on screen
3. In another tab/device, login as organizer and open `/checkin/[eventId]`
4. Allow camera access, scan the QR code
5. Green flash = valid; duplicate scan = already used
6. View `/checkin/[eventId]/logs` for scan history

### Flow 3 — Cancel & refund

1. Login as customer, go to `/my-bookings`
2. Find a paid booking, click "Cancel"
3. Confirm cancellation → booking status changes to "Cancelled"
4. Stripe refund initiated automatically (check Stripe dashboard in test mode)

### Flow 4 — Organizer approval

1. Register a new account with role "Organizer"
2. Login as admin → `/admin/organizers/pending`
3. Approve the new organizer
4. Login as that organizer → `/organizer/events` now accessible

### Flow 5 — Promo code

1. Login as admin → `/admin/promo-codes` → create code `DEMO20` with 20% discount
2. Login as customer, start a booking, enter `DEMO20` in promo field
3. Verify total is reduced before payment

### Flow 6 — Analytics

1. Login as organizer → `/organizer/events/[id]/analytics`
2. View revenue over time chart, ticket type breakdown, refund count
3. Login as admin → `/admin/stats` for platform-wide numbers

---

## Seed Data

Running `npm run seed:run:relational` in `apps/api` populates:
- 3 user accounts (admin, customer, organizer)
- Sample events with multiple ticket types
- Roles: Admin (id=1), User (id=2)

To reset and reseed: stop API, drop/recreate DB, run migrations, run seed.
