# Organizer Dashboard Update

**Date:** 2026-06-11  
**Branch:** `gia-ui-version-2`  
**Scope:** Organizer "My Events" experience — backend APIs, web UI, and bug fixes.

---

## Summary

Replaced the minimal organizer events table with a full **event command center**: KPI overview, searchable card grid, calendar view, per-event hub with tabs, live check-in panel, duplicate/export actions, and portal-based action menus. All organizer-facing copy is in **English**.

---

## Backend (`apps/api`)

### New DTOs

| File | Purpose |
|------|---------|
| `src/analytics/dto/organizer-stats.dto.ts` | Aggregated organizer KPIs |
| `src/events/dto/organizer-event-summary.dto.ts` | Event + inline sales/check-in metrics |

### `AnalyticsService` — new methods

- **`getOrganizerStats(organizerId)`** — total events, live count, revenue, tickets sold, draft/upcoming counts.
- **`getOrganizerEvents(organizerId, query)`** — paginated event list with per-event summary fields:
  - `ticketsSold`, `totalCapacity`, `revenue`, `checkInRate`, `ticketTypeCount`, `staffCount`
  - Supports `keyword`, `status`, `category`, `dateFrom`, `dateTo`, and `sort` (`createdAt` \| `startTime` \| `revenue` \| `sold` \| `name`).

### `EventsController` — new / changed routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/events/my/stats` | Organizer KPI strip data |
| `GET` | `/api/v1/events/my` | Now returns `OrganizerEventSummaryDto[]` (enriched) instead of plain `Event[]` |
| `POST` | `/api/v1/events/:id/duplicate` | Clone event + ticket types as new DRAFT |

### `EventsService`

- **`duplicate(id, organizerId, isAdmin)`** — copies event metadata and all ticket types (`soldQty`/`reservedQty` reset to 0). Appends `(Copy)` suffix on name when duplicating.

### `QueryEventDto`

- Added optional **`sort`** field for organizer list ordering.

### `EventsModule`

- Imports `RelationalTicketTypePersistenceModule` for duplicate flow.

---

## Frontend (`apps/web`)

### New routes

| Route | Description |
|-------|-------------|
| `/organizer/events` | Redesigned dashboard (grid / list / calendar) |
| `/organizer/events/[id]` | Event hub overview |
| `/organizer/events/[id]/checkin` | Live check-in + attendee export |

### New layout & components

| Path | Role |
|------|------|
| `app/organizer/layout.tsx` | Wraps organizer pages in `OrganizerLayout` |
| `components/organizer/organizer-layout.tsx` | Shell: welcome bar, nav (My Events, Create Event) |
| `components/organizer/organizer-kpi-strip.tsx` | 4 KPI cards from `/events/my/stats` |
| `components/organizer/organizer-event-card.tsx` | Banner card with metrics + Manage / ⋮ actions |
| `components/organizer/event-actions-menu.tsx` | Portal dropdown (publish, edit, analytics, staff, duplicate, export, delete) |
| `components/organizer/organizer-calendar.tsx` | Month calendar view |
| `components/organizer/event-hub-nav.tsx` | Tab nav: Overview, Ticket types, Staff, Analytics, Check-in, Settings |
| `components/organizer/checkin-live-panel.tsx` | Check-in rate + recent logs (15s auto-refresh) |
| `lib/organizer-utils.ts` | `fmtVnd`, date helpers, attention alerts, CSV export |

### API client (`lib/api.ts`)

Extended `organizerApi`:

- `getStats()` → `GET /events/my/stats`
- `getEvents(query?)` → enriched list with filters/sort
- `duplicateEvent(id)` → `POST /events/:id/duplicate`
- `getAttendees(eventId)` → `GET /tickets/events/:eventId/attendees`

### Types (`lib/types.ts`)

- `OrganizerStats`, `OrganizerEventSummary`, `EventAttendee`
- `EventQuery.sort` union type

### Updated sub-pages

- `organizer/events/[id]/analytics`, `staff`, `ticket-types` — added `EventHubNav`, English copy, consistent back links.
- `components/site-header.tsx` — nav label **My Events**.

### UI bug fix

**Problem:** Action menu (⋮) was clipped inside event cards — only the top edge of dropdown items was visible.

**Fix:**
1. Removed `overflow-hidden` from event cards; use `overflow-visible` + `hover:z-20`.
2. Render dropdown via **React portal** to `document.body` with `position: fixed`.
3. Auto-flip menu above trigger when insufficient viewport space below.

### Language

All Vietnamese strings in organizer surfaces were converted to English (labels, toasts, alerts, empty states, CSV headers, date/currency locale `en-US`).

### Incidental fix

- `apps/web/app/staff/dashboard/[eventId]/page.tsx` — `Select.onValueChange` null-safe handler (production build type error).

---

## Feature checklist (by phase)

### Phase 1 — Dashboard

- [x] Organizer layout shell
- [x] KPI strip (total events, live, revenue, tickets sold)
- [x] Event cards with banner, status badges, sales progress
- [x] Search, status filter, sort, pagination
- [x] Grid / list / calendar view toggle
- [x] Attention alerts (no ticket types, no staff, low check-in)
- [x] Quick publish, duplicate, delete (draft), export CSV
- [x] Empty state with onboarding steps
- [x] Toast notifications + AlertDialog for delete

### Phase 2 — Event hub

- [x] `/organizer/events/[id]` overview page
- [x] `EventHubNav` on all event sub-pages
- [x] Live check-in panel with auto-refresh
- [x] To-do sidebar (add tickets, assign staff, analytics link)

### Phase 3 — Extras

- [x] Calendar month view
- [x] Duplicate event (API + UI)
- [x] Export attendees CSV (client-side from attendees API)

---

## How to test

1. Start infrastructure: `docker compose up -d postgres redis maildev`
2. API: `cd apps/api && npm run start:dev`
3. Web: `cd apps/web && npm run dev`
4. Login as organizer seed user:
   - Email: `organizer@example.com`
   - Password: `secret`
5. Open http://localhost:3000/organizer/events
6. Verify: KPI cards load, filters work, ⋮ menu opens fully, event hub tabs navigate correctly.

---

## Breaking change note

`GET /api/v1/events/my` response items now include summary fields (`ticketsSold`, `revenue`, etc.) via `OrganizerEventSummaryDto`. Any client expecting plain `Event` shape should read only the base event fields or migrate to the new type.
