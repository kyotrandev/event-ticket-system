'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminTicketSummary } from '@/lib/types';
import { OrganizerTicketsTable } from '@/components/organizer/organizer-tickets-table';
import { EventHubNav } from '@/components/organizer/event-hub-nav';

export default function AdminEventTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTickets({ eventId: id, limit: 50 });
      setTickets(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Link href={`/admin/events/${id}`} className="text-sm font-bold text-muted-foreground hover:text-primary">
        ← Event overview
      </Link>
      <EventHubNav eventId={id} basePath="/admin/events" variant="admin" />
      <h1 className="text-2xl font-extrabold">Event tickets</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <OrganizerTicketsTable
          tickets={tickets}
          showEvent={false}
          detailBase="/admin/tickets"
        />
      )}
    </div>
  );
}
