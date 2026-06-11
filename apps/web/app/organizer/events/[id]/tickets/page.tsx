'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { organizerApi } from '@/lib/api';
import type { OrganizerTicketSummary } from '@/lib/types';
import { EventHubNav } from '@/components/organizer/event-hub-nav';
import { OrganizerTicketsTable } from '@/components/organizer/organizer-tickets-table';
import { buttonVariants } from '@/components/ui/button';

export default function EventTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const [tickets, setTickets] = useState<OrganizerTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApi.getTickets({ eventId, limit: 50 });
      setTickets(res.data);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
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
        <h1 className="text-2xl font-extrabold">Sold tickets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All issued tickets for this event.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <OrganizerTicketsTable tickets={tickets} showEvent={false} />
      )}
    </div>
  );
}
