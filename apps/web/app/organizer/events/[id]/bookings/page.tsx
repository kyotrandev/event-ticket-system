'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { organizerApi } from '@/lib/api';
import type { OrganizerBookingSummary } from '@/lib/types';
import { EventHubNav } from '@/components/organizer/event-hub-nav';
import { OrganizerBookingsTable } from '@/components/organizer/organizer-bookings-table';
import { buttonVariants } from '@/components/ui/button';

export default function EventBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const [bookings, setBookings] = useState<OrganizerBookingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApi.getBookings({ eventId, limit: 50 });
      setBookings(res.data);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Link
        href={`/organizer/events/${eventId}`}
        className={buttonVariants({ variant: 'ghost', className: 'rounded-2xl font-bold -ml-2' })}
      >
        <ArrowLeft className="size-4 mr-2" />
        Event overview
      </Link>

      <EventHubNav eventId={eventId} />

      <div>
        <h1 className="text-2xl font-extrabold">Event bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customer orders for this event only.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <OrganizerBookingsTable
          bookings={bookings}
          detailBase="/organizer/bookings"
        />
      )}
    </div>
  );
}
