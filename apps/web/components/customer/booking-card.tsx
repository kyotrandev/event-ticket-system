'use client';

import Link from 'next/link';
import { CalendarDays, ChevronRight, MapPin, Ticket } from 'lucide-react';
import type { Booking } from '@/lib/types';
import {
  fmtDateTime,
  fmtVnd,
  getItemsSummary,
  getPrimaryEvent,
  getTicketCount,
  parseLocation,
  shortBookingId,
} from '@/lib/booking-utils';
import { BookingStatusBadge } from './booking-status-badge';
import { BookingCountdown } from './booking-countdown';
import { Card, CardContent } from '@/components/ui/card';

interface BookingCardProps {
  booking: Booking;
}

export function BookingCard({ booking }: BookingCardProps) {
  const event = getPrimaryEvent(booking);
  const ticketCount = getTicketCount(booking);

  return (
    <Link href={`/my-bookings/${booking.id}`} className="block group">
      <Card className="overflow-hidden border-2 border-border rounded-3xl pt-0 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
        <div className="relative aspect-[16/6] bg-muted overflow-hidden border-b-2 border-border">
          {event?.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.bannerUrl}
              alt={event.name}
              className="size-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-primary/5 text-primary/40 font-bold text-sm">
              {event?.name ?? 'Event booking'}
            </div>
          )}
          <div className="absolute top-3 right-3">
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-extrabold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {event?.name ?? 'Booking'}
              </h3>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                #{shortBookingId(booking.id)}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
          </div>

          {event && (
            <div className="space-y-1.5 text-sm text-muted-foreground font-medium">
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-primary" />
                {fmtDateTime(event.startTime)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-destructive" />
                <span className="line-clamp-1">{parseLocation(event.location)}</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                <Ticket className="size-4 text-primary" />
                {ticketCount} ticket{ticketCount !== 1 ? 's' : ''}
              </span>
              <span className="text-muted-foreground line-clamp-1">
                {getItemsSummary(booking)}
              </span>
            </div>
            <span className="text-base font-extrabold text-foreground">
              {fmtVnd(booking.totalAmount)}
            </span>
          </div>

          {booking.status === 'pending_payment' && (
            <BookingCountdown expiresAt={booking.expiresAt} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
