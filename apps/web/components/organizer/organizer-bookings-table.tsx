'use client';

import Link from 'next/link';
import type { OrganizerBookingSummary } from '@/lib/types';
import {
  BOOKING_STATUS_LABELS,
  bookingStatusBadgeVariant,
  fmtDateTime,
  fmtVnd,
  shortBookingId,
} from '@/lib/booking-utils';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

export function OrganizerBookingsTable({
  bookings,
  detailBase = '/organizer/bookings',
  showOrganizer = false,
}: {
  bookings: (OrganizerBookingSummary & { organizerName?: string; organizerEmail?: string })[];
  detailBase?: string;
  showOrganizer?: boolean;
}) {
  if (!bookings.length) {
    return (
      <p className="text-center text-muted-foreground py-12 rounded-3xl border-2 border-dashed">
        No bookings found for this scope.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b-2 border-border">
            <tr className="text-left">
              <th className="px-4 py-3 font-bold">Order</th>
              <th className="px-4 py-3 font-bold">Event</th>
              {showOrganizer && <th className="px-4 py-3 font-bold">Organizer</th>}
              <th className="px-4 py-3 font-bold">Customer</th>
              <th className="px-4 py-3 font-bold">Tickets</th>
              <th className="px-4 py-3 font-bold">Total</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold" />
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-border/60 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">#{shortBookingId(b.id)}</td>
                <td className="px-4 py-3 font-semibold max-w-[180px] truncate">
                  {b.eventName}
                </td>
                {showOrganizer && (
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.organizerName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{b.organizerEmail ?? ''}</p>
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-medium">{b.customerName}</p>
                  <p className="text-xs text-muted-foreground">{b.customerEmail}</p>
                </td>
                <td className="px-4 py-3">{b.ticketCount}</td>
                <td className="px-4 py-3 font-bold">{fmtVnd(b.totalAmount)}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={bookingStatusBadgeVariant(b.status)}
                    className="rounded-full font-bold"
                  >
                    {BOOKING_STATUS_LABELS[b.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {fmtDateTime(b.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`${detailBase}/${b.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm', className: 'rounded-xl font-bold' })}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
