'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { organizerApi } from '@/lib/api';
import type { OrganizerEventSummary } from '@/lib/types';
import { exportAttendeesCsv } from '@/lib/organizer-utils';
import { EventHubNav } from '@/components/organizer/event-hub-nav';
import { CheckinLivePanel } from '@/components/organizer/checkin-live-panel';
import { Button } from '@/components/ui/button';

export default function EventCheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<OrganizerEventSummary | null>(null);

  useEffect(() => {
    organizerApi
      .getEvents({ limit: 100 })
      .then((res) => {
        const found = res.data.find((e) => e.id === id);
        if (found) setEvent(found);
        else return organizerApi.getEvent(id).then((ev) =>
          setEvent({
            ...ev,
            ticketsSold: 0,
            totalCapacity: 0,
            revenue: 0,
            checkInRate: 0,
            ticketTypeCount: 0,
            staffCount: 0,
          }),
        );
      })
      .catch(() => toast.error('Failed to load event'));
  }, [id]);

  async function handleExport() {
    if (!event) return;
    try {
      const attendees = await organizerApi.getAttendees(id);
      exportAttendeesCsv(attendees, event.name);
      toast.success('CSV exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export file');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/organizer/events"
            className="text-sm font-bold text-muted-foreground hover:text-primary"
          >
            ← My Events
          </Link>
          <h1 className="text-2xl font-extrabold mt-2">
            Check-in — {event?.name ?? '…'}
          </h1>
        </div>
        {event && event.ticketsSold > 0 && (
          <Button
            variant="outline"
            className="rounded-2xl font-bold"
            onClick={() => void handleExport()}
          >
            <Download className="size-4 mr-2" />
            Export attendees
          </Button>
        )}
      </div>

      <EventHubNav eventId={id} />

      <CheckinLivePanel
        eventId={id}
        checkInRate={event?.checkInRate ?? 0}
        ticketsSold={event?.ticketsSold ?? 0}
      />
    </div>
  );
}
