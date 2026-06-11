'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import type { AdminBookingSummary } from '@/lib/types';
import { OrganizerBookingsTable } from '@/components/organizer/organizer-bookings-table';
import { EventHubNav } from '@/components/organizer/event-hub-nav';

export default function AdminEventBookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bookings, setBookings] = useState<AdminBookingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBookings({ eventId: id, limit: 50 });
      setBookings(res.data);
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
      <h1 className="text-2xl font-extrabold">Event bookings</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <OrganizerBookingsTable
          bookings={bookings}
          detailBase="/admin/bookings"
          showOrganizer={false}
        />
      )}
    </div>
  );
}
