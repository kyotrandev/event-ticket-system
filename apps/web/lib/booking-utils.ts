import type { Booking, BookingStatus, EventModel } from './types';

export function fmtVnd(n: number) {
  if (n === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

export function parseLocation(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { address?: string };
    return parsed.address ?? raw;
  } catch {
    return raw;
  }
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  expired: 'Expired',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const BOOKING_STATUS_DESCRIPTIONS: Record<BookingStatus, string> = {
  pending_payment: 'Complete payment before the hold expires.',
  paid: 'Payment confirmed. Your tickets are ready.',
  expired: 'Payment window closed. Inventory was released.',
  failed: 'Payment could not be processed.',
  refunded: 'Booking cancelled and refund issued.',
};

export function bookingStatusBadgeVariant(
  status: BookingStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'paid') return 'default';
  if (status === 'pending_payment') return 'outline';
  if (status === 'refunded') return 'secondary';
  return 'destructive';
}

export function getPrimaryEvent(booking: Booking): EventModel | null {
  return booking.items?.[0]?.ticketType?.event ?? null;
}

export function getTicketCount(booking: Booking): number {
  return booking.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function getItemsSummary(booking: Booking): string {
  if (!booking.items?.length) return 'No items';
  return booking.items
    .map((item) => `${item.quantity}× ${item.ticketType?.name ?? 'Ticket'}`)
    .join(', ');
}

export type BookingFilter = 'all' | 'active' | 'past';

const ACTIVE_STATUSES: BookingStatus[] = ['pending_payment', 'paid'];
const PAST_STATUSES: BookingStatus[] = ['expired', 'failed', 'refunded'];

export function filterBookings(
  bookings: Booking[],
  filter: BookingFilter,
): Booking[] {
  if (filter === 'all') return bookings;
  if (filter === 'active') {
    return bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  }
  return bookings.filter((b) => PAST_STATUSES.includes(b.status));
}

export function shortBookingId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
