# Event Ticket Management System — Product Specification

**Version:** 1.0  
**Last updated:** 2026-05-31  
**Stack:** Next.js 15 + Nest.js + PostgreSQL + Redis + Stripe + Cloudinary + Docker + GitHub Actions

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Domain Model](#3-domain-model)
4. [Phase 1 — Authentication & User Management](#4-phase-1--authentication--user-management)
5. [Phase 2 — Event & Ticket Type Management](#5-phase-2--event--ticket-type-management)
6. [Phase 3 — Booking & Payment](#6-phase-3--booking--payment)
7. [Phase 4 — Check-In System](#7-phase-4--check-in-system)
8. [Phase 5 — Cancellation, Refund & Waitlist](#8-phase-5--cancellation-refund--waitlist)
9. [Phase 6 — Analytics & Admin Panel](#9-phase-6--analytics--admin-panel)
10. [Phase 7 — Infrastructure & DevOps](#10-phase-7--infrastructure--devops)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Key Constraints & Invariants](#12-key-constraints--invariants)
13. [API Surface](#13-api-surface)

---

## 1. System Overview

The Event Ticket Management System supports the complete lifecycle of event ticketing: creation, publication, online sales, payment, QR ticket delivery, and gate validation.

### User Roles

| Role | Description |
|---|---|
| **Customer** | Browses events, purchases tickets, manages bookings |
| **Organizer** | Creates and manages events, ticket types, views analytics |
| **Staff** | Validates tickets at event gates (assigned per event) |
| **Admin** | Manages all users, approves organizers, views system stats |

### Role Acquisition

- **Customer** — default role on registration (email or Google OAuth)
- **Organizer** — self-register, requires Admin approval before creating events
- **Staff** — assigned by Admin; Organizer can assign Staff to their own events
- **Admin** — created directly by existing Admin (no self-registration)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) + Shadcn/UI + Tailwind CSS | |
| Backend | Nest.js + TypeORM | Modular monolith |
| Database | PostgreSQL | |
| Cache / Queue | Redis + BullMQ | |
| Auth | JWT (access 15m + refresh 7d) + Google OAuth 2.0 | |
| Payment | Stripe | VND currency, test mode for dev |
| Storage | Cloudinary | Event banners, QR images |
| Email | Resend + React Email | Transactional emails |
| PDF | `@react-pdf/renderer` (backend) | Ticket PDF generation |
| Deploy | Docker + GitHub Actions → GHCR → VPS | |

---

## 3. Domain Model

### Entity Relationships

```
User ─── Role, Status
  │
  ├── [as Organizer] ──► Event
  │                        └── TicketType
  │
  └── [as Customer] ──► Booking ──► BookingItem (TicketType × qty)
                            ├── Payment (Stripe)
                            └── Ticket[] (1 per seat, carries QR)
                                  └── CheckInLog

EventStaffAssignment: Event ← → User(STAFF)
WaitlistEntry: User ─ TicketType
PromoCode (global, Admin-managed)
AuditLog (payments, status changes, revenue)
```

### Entity Definitions

```
User
  id, email, passwordHash?, name, avatarUrl
  role: CUSTOMER | ORGANIZER | STAFF | ADMIN
  status: PENDING_APPROVAL | ACTIVE | LOCKED
  googleId?, emailVerified, createdAt

Event
  id, organizerId → User
  name, description, location, category, tags[]
  startTime, endTime, bannerUrl (Cloudinary)
  cancellationWindowHours   // organizer sets; hours before startTime cancel allowed
  maxTicketsPerOrder        // default 6
  status: DRAFT | PUBLISHED | ONGOING | ENDED | CANCELLED

TicketType
  id, eventId, name, price (integer, VND)
  totalQty, soldQty, reservedQty
  saleStart, saleEnd
  status: AVAILABLE | SOLD_OUT | CLOSED

Booking
  id, customerId, status, expiresAt (now+15m)
  promoCodeId?, subtotalAmount, discountAmount, totalAmount

BookingItem
  id, bookingId, ticketTypeId, quantity, unitPrice

Ticket
  id, bookingItemId, code (UUID v4), qrSecret (HMAC-SHA256)
  status: ISSUED | USED | CANCELLED

Payment
  id, bookingId, stripePaymentIntentId
  amount, currency (vnd), status
  stripeRefundId?, refundedAt?

PromoCode
  id, code (unique), discountType: PERCENT | FIXED
  discountValue, maxUses, usedCount
  validFrom, validTo, isActive

WaitlistEntry
  id, ticketTypeId, userId, createdAt
  notifiedAt?, expiresAt?, status: WAITING | NOTIFIED | FULFILLED | EXPIRED

EventStaffAssignment
  id, eventId, staffId → User

CheckInLog
  id, ticketId, staffId, scannedAt, method: QR | MANUAL

AuditLog
  id, userId, action, entity, entityId, payload, createdAt
```

### State Machines

**User status:**
```
[Organizer path]
PENDING_APPROVAL ──(Admin approve)──► ACTIVE
                 ──(Admin reject)───► LOCKED

[All roles]
ACTIVE ──(Admin lock)──► LOCKED ──(Admin unlock)──► ACTIVE
```

**Booking status:**
```
PENDING_PAYMENT ──(pay success)──► PAID ──(cancel within window)──► REFUNDED
      ├── (timeout 15m) ──► EXPIRED
      └── (pay failed)  ──► FAILED
```

**Ticket status:**
```
ISSUED ──(check-in)────────────────────────► USED
       ──(booking refunded/cancelled)──────► CANCELLED
```

**Event status:**
```
DRAFT ──► PUBLISHED ──► ONGOING ──► ENDED
              └─────────────────────────► CANCELLED (organizer/admin)
```

**Waitlist entry:**
```
WAITING ──(ticket available)──► NOTIFIED ──(user books within 48h)──► FULFILLED
                                          └──(48h timeout)──────────► EXPIRED → notify next
```

---

## 4. Phase 1 — Authentication & User Management

> **Status: ✅ Implemented** (commit `feat(auth): implement Phase 1`)

### Implementation Notes

**API prefix:** All endpoints at `/api/v1/...`  
**Admin endpoints:** `/api/v1/users/...` (JWT admin role required)  
**Rate limiting:** Login capped at 5 req/60s per IP via `@nestjs/throttler`

**Deviations from spec:**
- Refresh token returned in response body (not httpOnly cookie) — boilerplate default; frontend must store securely
- Rate limiting counts all login requests (not just failed ones) — conservative, acceptable trade-off
- Duplicate email returns 422 (boilerplate) not 409 — consistent with boilerplate error format

### User Stories

---

**US-1.1 — Customer Registration** ✅

> As a visitor, I want to register with my email and password so that I can purchase tickets.

**Acceptance Criteria:**

- ✅ Given a valid email (not already registered) and password (≥8 chars, at least 1 number, 1 uppercase), when I submit the registration form, then my account is created with role=CUSTOMER, status=ACTIVE, and I receive a verification email.
  - Endpoint: `POST /api/v1/auth/email/register` with `{ email, password, firstName, lastName }`
  - Verification email sent; clicking link is idempotent (ACTIVE user confirms → success)
- ⚠️ Given an email that already exists in the system, when I submit registration, then I receive a 409 error: "Email already in use."
  - Returns 422 (boilerplate convention), not 409
- ✅ Given a password shorter than 8 characters, when I submit, then I receive a 400 error with a specific validation message.
  - `@MinLength(8)` + `@Matches` for uppercase and number — returns 400 with field-level messages
- ✅ Given a valid registration, when I log in before verifying email, then I can still log in (email verification is advisory).

---

**US-1.2 — Organizer Registration** ✅

> As someone who wants to host events, I want to register as an Organizer so that I can create and manage events after Admin approval.

**Acceptance Criteria:**

- ✅ Given a valid email and password with `role=3` (organizer), when I submit registration, then my account is created with status=PENDING_APPROVAL.
  - Endpoint: `POST /api/v1/auth/email/register` with `{ ..., role: 3 }`
- ✅ Given status=PENDING_APPROVAL, when I attempt to log in, then I receive 403: "Account pending approval."
- ✅ Given a PENDING_APPROVAL organizer, when Admin approves (`POST /api/v1/users/:id/approve`), then status becomes ACTIVE and organizer receives an email notification.
- ✅ Given a PENDING_APPROVAL organizer, when Admin rejects (`POST /api/v1/users/:id/reject`), then status becomes LOCKED and organizer receives a rejection email.

---

**US-1.3 — Email/Password Login** ✅

> As a registered user, I want to log in with my email and password so that I can access my account.

**Acceptance Criteria:**

- ✅ Given valid credentials, when I log in, then I receive `{ token, refreshToken, tokenExpires, user }`.
  - Endpoint: `POST /api/v1/auth/email/login`
  - Access token expires in 15m; refresh token in 7d
- ✅ Given invalid credentials, when I log in, then I receive 401: "Invalid email or password" (fields not differentiated).
- ✅ Given a LOCKED account, when I log in, then I receive 403: "Account is locked. Contact support."
- ✅ Given 5 requests to the login endpoint from the same IP within 1 minute, the 6th receives 429.
  - Note: counts all requests (not only failed) — safe conservative approach
- ✅ Given an expired access token, the client uses the refresh token to get a new pair.

---

**US-1.4 — Google OAuth Login** ✅

> As a user, I want to sign in with Google so that I don't have to manage a password.

**Acceptance Criteria:**

- ✅ Given a Google ID token from `@react-oauth/google`, `POST /api/v1/auth/google/login { idToken }` creates/merges account with role=CUSTOMER, returns JWT pair.
- ✅ Given email already exists as local account, Google login merges `socialId` + `provider` onto existing account.
- ✅ Given already linked Google account, subsequent logins return fresh JWT pair.
- ⚠️ "No password change option shown" — frontend responsibility; backend `PATCH /auth/me` allows password change for any user; frontend should hide based on `provider` field.

---

**US-1.5 — Token Refresh** ✅

> As a logged-in user, I want my session to persist without re-logging in.

**Acceptance Criteria:**

- ✅ `POST /api/v1/auth/refresh` (Bearer: refreshToken) → new `{ token, refreshToken, tokenExpires }`, old token invalidated (rotation via session hash).
- ✅ Invalid/expired refresh token → 401.
- ✅ `POST /api/v1/auth/logout` → session deleted, refresh token invalidated → 204.

---

**US-1.6 — Admin: User Management** ✅

> As an Admin, I want to manage user accounts so that I can maintain system integrity.

**Acceptance Criteria:**

- ✅ `GET /api/v1/users?page=1&limit=10` → paginated list with role, status, dates. (JWT `role=admin` required)
- ✅ `POST /api/v1/users/:id/lock` → status=LOCKED, all sessions invalidated, user cannot log in.
- ✅ `POST /api/v1/users/:id/unlock` → status=ACTIVE.
- ✅ `PATCH /api/v1/users/:id/role` `{ role: { id: N } }` → role changed; takes effect on next token refresh.
- ✅ Non-admin JWT → 403 on all `/users/*` endpoints.
- ✅ `POST /api/v1/users/:id/approve` — approve PENDING_APPROVAL organizer → ACTIVE + email.
- ✅ `POST /api/v1/users/:id/reject` — reject PENDING_APPROVAL organizer → LOCKED + email.

---

## 5. Phase 2 — Event & Ticket Type Management

### User Stories

---

**US-2.1 — Create Event**

> As an Organizer with an approved account, I want to create an event so that I can sell tickets to it.

**Acceptance Criteria:**

- Given I am an ACTIVE Organizer, when I submit a valid event form (name, location, startTime, endTime, bannerUrl, category), then the event is created with status=DRAFT and I am the owner.
- Given startTime is in the past, when I submit, then I receive 400: "Start time must be in the future."
- Given endTime is before startTime, when I submit, then I receive 400: "End time must be after start time."
- Given I am a CUSTOMER or STAFF, when I call POST /events, then I receive 403.
- Given event creation succeeds, the banner image must already be uploaded to Cloudinary (frontend uploads first, submits URL).

---

**US-2.2 — Publish Event**

> As an Organizer, I want to publish my event so that customers can discover and book tickets.

**Acceptance Criteria:**

- Given an event in DRAFT status with at least one ACTIVE TicketType, when I publish it, then status becomes PUBLISHED and the event appears in GET /events.
- Given a DRAFT event with no TicketTypes, when I attempt to publish, then I receive 400: "Event must have at least one ticket type before publishing."
- Given a PUBLISHED event, when I update it (name, description, location), then the update is applied immediately; existing bookings are not affected.
- Given I am not the event owner, when I attempt PATCH /events/:id, then I receive 403. (Admin can edit any event.)

---

**US-2.3 — Cancel Event**

> As an Organizer, I want to cancel an event so that I can communicate unexpected cancellations to buyers.

**Acceptance Criteria:**

- Given a PUBLISHED or ONGOING event with existing PAID bookings, when I cancel it, then:
  - Event status becomes CANCELLED.
  - All PAID bookings are automatically refunded via Stripe.
  - All affected customers receive a cancellation + refund confirmation email.
  - All PENDING_PAYMENT bookings are immediately expired and inventory released.
- Given an ENDED event, when I attempt to cancel, then I receive 400: "Cannot cancel an ended event."

---

**US-2.4 — Create Ticket Types**

> As an Organizer, I want to define ticket types for my event so that I can sell different tiers at different prices.

**Acceptance Criteria:**

- Given a valid ticket type (name, price ≥ 0, totalQty ≥ 1, saleStart < saleEnd), when I submit, then the TicketType is created with soldQty=0, status=AVAILABLE.
- Given price = 0, when I submit, then it is accepted as a free ticket.
- Given saleEnd is after the event's startTime, when I submit, then I receive 400: "Sale end date cannot be after event start time."
- Given I reduce totalQty below soldQty (e.g., already sold 50, I try to set totalQty=30), when I submit, then I receive 400: "Cannot reduce quantity below number of tickets already sold (50)."
- Given a TicketType with soldQty = totalQty, then its status is automatically set to SOLD_OUT.

---

**US-2.5 — Browse and Search Events (Customer)**

> As a customer, I want to browse and search events so that I can find events I'm interested in.

**Acceptance Criteria:**

- Given I visit /events, then I see a paginated list (default 12/page) of PUBLISHED and ONGOING events, sorted by startTime ascending.
- Given I search by keyword, then events whose name or description contains the keyword (case-insensitive) are returned.
- Given I filter by category, then only events with that category are returned.
- Given I filter by date range, then only events whose startTime falls within the range are returned.
- Given I filter by location (text match), then events whose location contains the text are returned.
- Given filters are combined, then all filters apply together (AND logic).
- Given no results match filters, then an empty list with 0 total is returned (not 404).
- Given an event is in DRAFT or CANCELLED status, then it does not appear in GET /events for Customers.

---

**US-2.6 — View Event Detail**

> As a customer, I want to view full event details so that I can decide whether to buy tickets.

**Acceptance Criteria:**

- Given a PUBLISHED event, when I call GET /events/:id, then I receive full event details including all AVAILABLE TicketTypes with current availability (remainingQty = totalQty − soldQty − reservedQty).
- Given a TicketType's saleStart is in the future, then it appears with status=UPCOMING (not purchasable).
- Given a TicketType's saleEnd has passed, then it appears with status=CLOSED (not purchasable).
- Given the event is CANCELLED, when I call GET /events/:id, then the event is returned with status=CANCELLED and a cancellation notice.

---

## 6. Phase 3 — Booking & Payment

> **Status: ✅ Implemented (backend)** (commit `feat(api): implement Phase 3`)

### Implementation Notes

- **No-oversell** enforced via one transaction with `FOR UPDATE` row locks on `ticket_type`, acquired in sorted-id order (deadlock-free for multi-item bookings). Verified empirically: 10 concurrent bookings for 1 remaining seat → exactly one 201; DB invariant `soldQty + reservedQty ≤ totalQty` held.
- **Webhook idempotency** keyed on unique `stripePaymentIntentId` with a locked payment row; duplicate `payment_intent.succeeded` verified to issue tickets exactly once.
- **VND is zero-decimal in Stripe** — `amount = totalAmount` unscaled (no ×100).
- **Promo timing decision:** `usedCount` is consumed at *payment success*, not at booking creation, so expired/failed bookings never burn uses (SPEC is ambiguous between US-3.2 and US-3.4). Conditional UPDATE prevents overshooting `maxUses`.
- **Free/fully-discounted bookings** (`totalAmount = 0`) are fulfilled immediately without Stripe (synthetic `free_*` intent id).
- **Payment-after-expiry edge:** recorded as `payment.succeeded_after_expiry` in AuditLog for manual refund until Phase 5 automates it.
- **Deviations:** validation errors return 422 (boilerplate convention) where SPEC says 400; ticket email ships QR PNG attachments — PDF rendering (`@react-pdf/renderer`) deferred within the phase.

### User Stories

---

**US-3.1 — Create Booking with Seat Hold**

> As a customer, I want to reserve tickets temporarily while I complete payment so that my selected tickets are not sold to someone else.

**Acceptance Criteria:**

- Given I am logged in and select a valid quantity of an AVAILABLE TicketType, when I create a booking, then:
  - `reservedQty` is atomically incremented by the requested quantity using a database transaction with pessimistic locking.
  - A Booking is created with status=PENDING_PAYMENT, expiresAt=now+15m.
  - A BullMQ job is enqueued to expire the booking at expiresAt.
  - I receive the bookingId and expiresAt in the response.
- Given I request more tickets than available (totalQty − soldQty − reservedQty < requested), when I create a booking, then I receive 400: "Only N tickets remaining for [TicketType name]."
- **Concurrency invariant:** Given exactly 1 ticket remains and two customers simultaneously call POST /bookings for that ticket, then exactly one succeeds and the other receives the "insufficient tickets" error. (Test with concurrent requests.)
- Given I request more than the event's maxTicketsPerOrder (default 6) in a single order, when I submit, then I receive 400: "Maximum N tickets per order."
- Given I am not logged in, when I call POST /bookings, then I receive 401.

---

**US-3.2 — Apply Promo Code**

> As a customer, I want to apply a promo code to my booking so that I can get a discount.

**Acceptance Criteria:**

- Given a valid, active promo code (within validFrom/validTo, usedCount < maxUses), when I include it in POST /bookings, then the discount is applied: discountAmount is calculated and totalAmount = subtotalAmount − discountAmount (minimum 0).
- Given a PERCENT promo code (e.g., 20%), then discountAmount = floor(subtotalAmount × 0.20).
- Given a FIXED promo code (e.g., 50,000 VND), then discountAmount = min(50000, subtotalAmount).
- Given an invalid or expired promo code, when I submit, then I receive 400: "Invalid or expired promo code."
- Given a promo code at maxUses, when I try to use it, then I receive 400: "Promo code has reached its usage limit."
- Given a promo code is applied, then PromoCode.usedCount increments atomically (no overshooting maxUses under concurrent use).

---

**US-3.3 — Stripe Payment**

> As a customer, I want to pay for my booking securely with my card so that I receive my tickets.

**Acceptance Criteria:**

- Given a PENDING_PAYMENT booking, when I call POST /payments/intent/:bookingId, then a Stripe PaymentIntent is created with `amount=booking.totalAmount, currency=vnd` and the `client_secret` is returned.
- Given the Stripe Elements form is submitted with a valid test card (`4242 4242 4242 4242`), when the payment succeeds, then Stripe sends a `payment_intent.succeeded` webhook.
- Given the `payment_intent.succeeded` webhook is received, then:
  - Booking status → PAID.
  - `soldQty` increments, `reservedQty` decrements.
  - Ticket records are created (one per seat) with unique code (UUID v4) and qrSecret.
  - A PDF ticket email job is enqueued.
  - An AuditLog entry is written.
- **Idempotency invariant:** Given a duplicate `payment_intent.succeeded` webhook (same Stripe event ID) is received, then tickets are generated exactly once. (Idempotency key check on stripePaymentIntentId.)
- Given the `payment_intent.payment_failed` webhook is received, then:
  - Booking status → FAILED.
  - `reservedQty` decrements (inventory released).
  - Waitlist is notified if applicable.
- Given a booking at PENDING_PAYMENT status where the hold has expired (expiresAt < now), when the customer tries to pay, then they receive 410: "Booking expired. Please create a new booking."

---

**US-3.4 — Booking Expiry**

> As the system, I want to automatically cancel unpaid bookings after 15 minutes so that reserved inventory is released for other customers.

**Acceptance Criteria:**

- Given a PENDING_PAYMENT booking, when 15 minutes pass without payment, then:
  - The BullMQ expire-booking job fires.
  - Booking status → EXPIRED.
  - `reservedQty` decrements (inventory released).
  - Waitlist is checked and next entry notified if inventory is now available.
- Given the booking is paid (PAID) before the expiry job fires, then the expiry job is a no-op (idempotent check: only expire PENDING_PAYMENT bookings).
- Given the expiry job fails (Redis crash, etc.), then the job retries with exponential backoff up to 3 times.

---

**US-3.5 — Ticket Delivery**

> As a customer who has paid, I want to receive my QR ticket by email so that I can attend the event.

**Acceptance Criteria:**

- Given a PAID booking, when the email job processes, then the customer receives an email containing:
  - Event name, date, location.
  - One PDF attachment per ticket with: ticket type name, ticket code, QR code image.
- Given the email fails to deliver, then the job retries up to 3 times; failure is logged to AuditLog.
- Given I am logged in as the ticket owner, when I call GET /tickets/me, then I see all my tickets with their status (ISSUED/USED/CANCELLED) and event details.
- Given I call GET /tickets/:code/qr, then I receive the QR image (PNG) only if I own the ticket or am STAFF/ADMIN.

---

## 7. Phase 4 — Check-In System

### User Stories

---

**US-4.1 — Staff Assignment to Events**

> As an Organizer, I want to assign Staff members to my event so that they can validate tickets at the gate.

**Acceptance Criteria:**

- Given I am the Organizer owner of an event, when I call POST /events/:id/staff `{staffId}`, then an EventStaffAssignment is created.
- Given the user being assigned is not role=STAFF, when I submit, then I receive 400: "User is not a Staff member."
- Given an assignment already exists for that staff+event pair, when I submit again, then I receive 409: "Staff already assigned to this event."
- Given I am not the event owner, when I try to assign staff, then I receive 403.
- Given I am Admin, then I can assign staff to any event.

---

**US-4.2 — QR Code Scanning**

> As a Staff member assigned to an event, I want to scan attendee QR codes with my webcam so that I can validate entry quickly.

**Acceptance Criteria:**

- Given I am Staff assigned to event X, when I access the check-in page for event X, then the webcam activates and the jsQR library continuously scans for QR codes.
- Given a valid QR code for an ISSUED ticket belonging to event X, when scanned, then:
  - HMAC signature is verified server-side.
  - Ticket status → USED.
  - CheckInLog is created with staffId, scannedAt, method=QR.
  - UI shows green "VALID" with attendee name and ticket type.
- **Reuse invariant:** Given a ticket already in USED status, when re-scanned, then:
  - Ticket is NOT updated (no second CheckInLog).
  - Response returns ALREADY_USED with original check-in timestamp and staff name.
  - UI shows red "ALREADY USED — checked in at [time] by [staff]."
- **Tampered QR invariant:** Given a QR code with a manipulated ticket code (HMAC mismatch), when scanned, then response returns INVALID and UI shows red "INVALID TICKET."
- Given I am Staff NOT assigned to event X, when I call POST /checkin/scan `{code, eventId: X}`, then I receive 403: "Not assigned to this event."

---

**US-4.3 — Manual Ticket Code Entry**

> As a Staff member, I want to manually enter a ticket code when QR scanning fails so that attendees with damaged QR codes can still check in.

**Acceptance Criteria:**

- Given a valid ticket code entered manually, when I submit POST /checkin/manual, then the same validation logic as QR scan applies (HMAC is NOT checked for manual entry; code lookup is used instead).
- Given an invalid code (not found in DB), then response returns NOT_FOUND and UI shows "Ticket not found."
- Manual check-in creates CheckInLog with method=MANUAL.
- All same staff-assignment and reuse invariants apply as in US-4.2.

---

**US-4.4 — Check-In Logs**

> As an Organizer, I want to view real-time check-in activity for my event so that I can monitor attendance.

**Acceptance Criteria:**

- Given I own event X, when I call GET /checkin/logs/:eventId, then I receive a chronological list of CheckInLog entries with: ticket code (masked), attendee name, ticket type, scan time, method, staff name.
- Given I am Staff, when I call GET /checkin/logs/:eventId, then I receive 403 (logs are organizer-only).
- Given Admin calls GET /checkin/logs/:eventId, then they can view logs for any event.

---

## 8. Phase 5 — Cancellation, Refund & Waitlist

### User Stories

---

**US-5.1 — Customer Ticket Cancellation**

> As a customer, I want to cancel my booking and receive a refund so that I can get my money back if my plans change.

**Acceptance Criteria:**

- Given a PAID booking where `event.startTime − now > event.cancellationWindowHours`, when I call DELETE /bookings/:id, then:
  - Stripe refund is initiated (stripe.refunds.create).
  - Booking status → REFUNDED (immediately, not waiting for webhook).
  - All Tickets in booking → CANCELLED.
  - soldQty decrements.
  - Customer receives a cancellation confirmation email.
  - Waitlist for affected TicketTypes is notified.
- Given `event.startTime − now ≤ event.cancellationWindowHours`, when I attempt to cancel, then I receive 403: "Cancellation window has closed. No refunds available within [N] hours of the event."
- Given a booking that is not PAID (EXPIRED, FAILED, REFUNDED), when I attempt to cancel, then I receive 400: "Only PAID bookings can be cancelled."
- Given I attempt to cancel another customer's booking, when I submit, then I receive 403.

---

**US-5.2 — Stripe Refund Confirmation**

> As the system, I want to confirm refund completion via Stripe webhook so that payment records are accurate.

**Acceptance Criteria:**

- Given Stripe sends `charge.refund.updated` with status=succeeded, then Payment.stripeRefundId and Payment.refundedAt are updated.
- Given a duplicate refund webhook (same refund ID), then the record is updated idempotently (no duplicate writes).
- Refund events are written to AuditLog.

---

**US-5.3 — Waitlist for Sold-Out Tickets**

> As a customer, I want to join a waitlist for a sold-out ticket type so that I am notified if a ticket becomes available.

**Acceptance Criteria:**

- Given a TicketType with status=SOLD_OUT, when I call POST /waitlist `{ticketTypeId}`, then a WaitlistEntry is created for my userId with status=WAITING.
- Given I am already on the waitlist for that TicketType, when I submit again, then I receive 409: "Already on waitlist for this ticket type."
- Given I am not logged in, when I call POST /waitlist, then I receive 401.
- Given a ticket becomes available (booking cancelled/expired), when the system processes the release, then:
  - The oldest WAITING WaitlistEntry is transitioned to NOTIFIED.
  - notifiedAt and expiresAt (now+48h) are set.
  - The user receives an email with a direct link to book the ticket.
- Given 48 hours pass without the notified user booking, then:
  - WaitlistEntry → EXPIRED.
  - Next WAITING entry is notified.
- Given the notified user successfully books before 48h, then WaitlistEntry → FULFILLED.
- Given I call DELETE /waitlist/:id as the owner, then my WaitlistEntry is removed.

---

## 9. Phase 6 — Analytics & Admin Panel

### User Stories

---

**US-6.1 — Organizer Event Analytics**

> As an Organizer, I want to view sales analytics for my events so that I can understand my revenue and attendance.

**Acceptance Criteria:**

- Given I own event X, when I call GET /organizer/events/:id/analytics, then I receive:
  - Total tickets sold per TicketType.
  - Total revenue (sum of PAID bookings' totalAmount).
  - Check-in rate (USED tickets / ISSUED tickets × 100%).
  - Bookings over time (daily breakdown for the sale period).
  - Top promo codes used for this event.
- Given I do not own event X, when I call the endpoint, then I receive 403.
- Revenue figures reflect only PAID and REFUNDED bookings (REFUNDED bookings show as negative revenue adjustment).

---

**US-6.2 — Admin System Statistics**

> As an Admin, I want to see system-wide statistics so that I can monitor platform health.

**Acceptance Criteria:**

- When I call GET /admin/stats, then I receive:
  - Total registered users (breakdown by role).
  - Total events (breakdown by status: PUBLISHED / ONGOING / ENDED / CANCELLED).
  - Total bookings (breakdown by status: PAID / EXPIRED / REFUNDED).
  - Total gross revenue (sum of all PAID bookings' totalAmount across all events).
  - Total refunds issued.
- Given I am not Admin, when I call GET /admin/stats, then I receive 403.

---

**US-6.3 — Admin: Promo Code Management**

> As an Admin, I want to create and manage global promo codes so that I can run platform-wide promotions.

**Acceptance Criteria:**

- Given valid promo code details (code unique, discountType, discountValue > 0, validFrom < validTo, maxUses ≥ 1), when I create it, then it is active and usable by customers.
- Given a code that already exists, when I submit, then I receive 409: "Promo code already exists."
- Given I deactivate a promo code (isActive=false), when a customer tries to use it, then they receive 400: "Invalid or expired promo code."
- Given I call DELETE /promo-codes/:id, then the code is soft-deleted (isActive=false); existing bookings that used it are not affected.
- Given I am not Admin, when I call POST /promo-codes, then I receive 403.

---

**US-6.4 — Admin: Organizer Approval Queue**

> As an Admin, I want to review pending Organizer registrations so that I can approve or reject them.

**Acceptance Criteria:**

- When I call GET /admin/organizers/pending, then I receive a list of users with role=ORGANIZER and status=PENDING_APPROVAL.
- When I approve an organizer (PATCH /admin/users/:id/status `{status: "ACTIVE"}`), then status changes and an approval email is sent.
- When I reject an organizer (PATCH /admin/users/:id/status `{status: "LOCKED"}`), then status changes and a rejection email is sent.
- Both actions are recorded in AuditLog.

---

## 10. Phase 7 — Infrastructure & DevOps

### User Stories

---

**US-7.1 — Local Development Environment**

> As a developer, I want to run the full application locally with a single command so that I can develop efficiently.

**Acceptance Criteria:**

- Given `docker compose up` is run from the project root, then all services (Next.js, Nest.js, PostgreSQL, Redis) start and the app is accessible at `http://localhost:3000`.
- Given `.env.example` is copied to `.env`, all required env vars have working defaults for local dev (Stripe test keys, local Cloudinary, etc.).
- Given the database is empty on first run, then TypeORM migrations run automatically and seed data (1 Admin user, sample events) is applied.

---

**US-7.2 — CI Pipeline (Pull Request)**

> As a developer, I want every PR to run automated checks so that broken code cannot be merged.

**Acceptance Criteria:**

- Given a PR is opened or updated, then GitHub Actions runs:
  1. `lint` — ESLint + Prettier check (both frontend and backend).
  2. `test:unit` — Jest unit tests for Nest.js services.
  3. `test:e2e` — Nest.js e2e tests against a test PostgreSQL instance.
  4. `build` — `docker build` for both `api` and `web` images succeeds.
- Given any step fails, then the PR is blocked from merging.
- Given all steps pass in < 10 minutes, then the pipeline is considered acceptable.

---

**US-7.3 — CD Pipeline (Main Branch Deploy)**

> As a team, I want every merge to main to automatically deploy to the production server so that the latest code is always live.

**Acceptance Criteria:**

- Given a commit is pushed to `main` (directly or via merged PR), then:
  1. CI steps run (same as PR checks).
  2. Docker images are built and tagged with the commit SHA.
  3. Images are pushed to GitHub Container Registry (GHCR).
  4. The production server pulls the new images via `docker compose pull && docker compose up -d --no-downtime`.
- Given a deployment fails (image build error, test failure), then no new image is pushed and the previous version remains running.
- Zero-downtime deploy: `docker compose up -d` performs rolling restart so the app is never fully down.

---

**US-7.4 — Environment Configuration**

> As a developer, I want all configuration to be environment-variable-driven so that the same image can run in dev and production.

**Acceptance Criteria:**

- Given the `api` Docker image, when run with different env vars (different DB_URL, STRIPE_SECRET_KEY, CLOUDINARY_URL), then the correct service is connected.
- No secrets (API keys, DB passwords) are baked into Docker images; all images pass a `docker history` inspection showing no secret-containing layers.
- Given `NODE_ENV=production`, then Nest.js disables stack traces in error responses.

---

## 11. Non-Functional Requirements

### Security

| Requirement | Detail |
|---|---|
| Password hashing | bcrypt, cost factor 12 |
| Transport | HTTPS (TLS 1.2+) required in production |
| QR integrity | HMAC-SHA256(ticketCode + eventId + SERVER_SECRET) — reject mismatches |
| Stripe webhook | Verify `Stripe-Signature` header on all webhook calls |
| Rate limiting | Login: 5 req/min/IP; Check-in scan: 60 req/min/staffId |
| RBAC | Server-side guard on every protected route; 403 on unauthorized |
| OWASP | Validate and sanitize all user inputs; parameterized queries via TypeORM |

### Performance

| Metric | Target |
|---|---|
| Event search (GET /events) | < 2s at p95 |
| Booking creation | < 3s at p95 |
| Check-in scan response | < 500ms at p95 |
| Concurrent requests | Support ≥ 50 concurrent without degradation |

### Reliability

| Concern | Mitigation |
|---|---|
| Inventory overselling | DB transaction + pessimistic locking on TicketType.reservedQty |
| Duplicate webhooks | Idempotency key check on stripePaymentIntentId before processing |
| Job failures | BullMQ retry with exponential backoff, max 3 attempts |
| Data integrity | AuditLog for all payment, booking status, and revenue actions |

---

## 12. Key Constraints & Invariants

These six constraints must be enforced by the system at all times:

1. **No ticket overselling.** TicketType.soldQty + TicketType.reservedQty must never exceed totalQty. Enforced via DB transaction + pessimistic lock during booking creation.

2. **One ticket = one successful check-in.** A ticket in USED status can never transition back to ISSUED. Duplicate scan attempts return ALREADY_USED, never re-mark as USED, and never create a second CheckInLog.

3. **Unpaid bookings expire automatically.** Every PENDING_PAYMENT booking has a BullMQ job. Expiry is idempotent: only PENDING_PAYMENT bookings are transitioned.

4. **QR tickets are secure and unique.** Each ticket has a UUID v4 code and an HMAC signature. Any tampered QR code fails HMAC verification and is rejected as INVALID.

5. **All privileged actions require RBAC.** Server-side role guard on every non-public endpoint. Ownership checks on organizer-specific resources. Staff check-in gated to EventStaffAssignment.

6. **Revenue and payment data must remain consistent.** Stripe webhooks processed idempotently (same event ID processed once). soldQty, reservedQty, and AuditLog updated atomically with booking status changes.

---

## 13. API Surface

### Public

```
GET  /events                   # list + filter (q, category, date, location, page, limit)
GET  /events/:id               # event detail with ticket types
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/google/login         # token-exchange: frontend sends Google ID token, gets JWT pair
POST /promo-codes/validate     # { code, amount } → discount
POST /payments/webhook         # Stripe (verified by signature)
```

### Customer

```
GET    /bookings/me
POST   /bookings               # { items: [{ticketTypeId, quantity}], promoCode? }
GET    /bookings/:id
DELETE /bookings/:id           # cancel + refund
POST   /payments/intent/:bookingId
GET    /tickets/me
GET    /tickets/:code/qr
POST   /waitlist               # { ticketTypeId }
DELETE /waitlist/:id
GET    /waitlist/me
```

### Organizer

```
GET    /organizer/me/events
GET    /organizer/me/stats
POST   /events
PATCH  /events/:id
DELETE /events/:id
PATCH  /events/:id/status
GET    /events/:id/bookings
GET    /events/:id/analytics
POST   /events/:id/ticket-types
PATCH  /ticket-types/:id
DELETE /ticket-types/:id
GET    /events/:id/staff
POST   /events/:id/staff       # { staffId }
DELETE /events/:id/staff/:staffId
```

### Staff

```
POST  /checkin/scan            # { code, eventId }
POST  /checkin/manual          # { code, eventId }
```

### Admin

```
GET   /admin/users
PATCH /admin/users/:id/status
PATCH /admin/users/:id/role
GET   /admin/stats
GET   /admin/organizers/pending
POST  /admin/promo-codes
GET   /admin/promo-codes
PATCH /admin/promo-codes/:id
DELETE /admin/promo-codes/:id
GET   /checkin/logs/:eventId
GET   /tickets/:code/qr        # admin can view any ticket QR
```

---

*End of SPEC v1.0*
