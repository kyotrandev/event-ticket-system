'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, organizerApi, staffApi, ticketTypeApi } from '@/lib/api';
import type { AdminEventSummary, EventAnalytics } from '@/lib/types';
import { fmtDateTime, fmtVnd, parseLocation } from '@/lib/organizer-utils';
import { getEventStatusTag } from '@/components/event-card';
import { EventHubNav } from '@/components/organizer/event-hub-nav';
import { CheckinLivePanel } from '@/components/organizer/checkin-live-panel';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminEventHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<AdminEventSummary | null>(null);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      organizerApi.getEvent(id),
      organizerApi.getAnalytics(id).catch(() => null),
      ticketTypeApi.list(id).catch(() => []),
      staffApi.list(id).catch(() => []),
      adminApi.getEvents({ limit: 50 }).catch(() => ({ data: [] })),
    ])
      .then(([ev, an, types, staffList, allEvents]) => {
        const adminMeta = allEvents.data.find((e) => e.id === id);
        const ticketsSold = types.reduce((s, t) => s + t.soldQty, 0);
        const totalCapacity = types.reduce((s, t) => s + t.totalQty, 0);
        setEvent({
          ...ev,
          ticketsSold,
          totalCapacity,
          revenue: an?.totalRevenue ?? 0,
          checkInRate: an?.checkInRate ?? 0,
          ticketTypeCount: types.length,
          staffCount: staffList.length,
          organizerName: adminMeta?.organizerName ?? 'Unknown',
          organizerEmail: adminMeta?.organizerEmail ?? 'Unknown',
        });
        setAnalytics(an);
      })
      .catch(() => toast.error('Failed to load event'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="h-48 bg-muted rounded-3xl animate-pulse" />;
  }

  if (!event) {
    return <p className="text-muted-foreground">Event not found.</p>;
  }

  const tag = getEventStatusTag(event);
  const soldPct =
    event.totalCapacity > 0
      ? Math.round((event.ticketsSold / event.totalCapacity) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/events"
        className="text-sm font-bold text-muted-foreground hover:text-primary"
      >
        ← All events
      </Link>

      <EventHubNav eventId={id} basePath="/admin/events" variant="admin" />

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{event.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className={`rounded-full font-bold ${tag.className}`}>{tag.label}</Badge>
            <Badge variant="outline" className="rounded-full">{event.category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Organizer: {event.organizerName} · {event.organizerEmail}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {fmtDateTime(event.startTime)} · {parseLocation(event.location)}
          </p>
        </div>
        <Link
          href={`/organizer/events/${id}`}
          className={buttonVariants({ variant: 'outline', className: 'rounded-2xl font-bold gap-2' })}
        >
          <ExternalLink className="size-4" />
          Organizer view
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Tickets sold</p>
            <p className="text-2xl font-extrabold mt-1">
              {event.ticketsSold}/{event.totalCapacity}
            </p>
            <p className="text-xs text-muted-foreground">{soldPct}% capacity</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-4 flex gap-3">
            <Wallet className="size-5 text-primary shrink-0 mt-1" />
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Revenue</p>
              <p className="text-2xl font-extrabold">{fmtVnd(event.revenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Check-in rate</p>
            <p className="text-2xl font-extrabold mt-1">{event.checkInRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">Staff assigned</p>
            <p className="text-2xl font-extrabold mt-1">{event.staffCount}</p>
          </CardContent>
        </Card>
      </div>

      <CheckinLivePanel
        eventId={id}
        checkInRate={event.checkInRate}
        ticketsSold={event.ticketsSold}
      />

      {analytics && analytics.topPromoCodes.length > 0 && (
        <Card className="border-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Top promo codes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {analytics.topPromoCodes.slice(0, 5).map((p) => (
              <div key={p.code} className="flex justify-between">
                <span className="font-mono">{p.code}</span>
                <span>{p.usageCount} uses · {fmtVnd(p.totalDiscount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
