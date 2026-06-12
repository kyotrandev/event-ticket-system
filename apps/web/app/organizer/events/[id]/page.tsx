'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-muted/40 animate-pulse rounded-2xl border-2 border-border" />
});
import {
  ExternalLink,
  Rocket,
  Ticket,
  UserCog,
  Wallet,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { organizerApi, staffApi, ticketTypeApi } from '@/lib/api';
import type { EventAnalytics, OrganizerEventSummary } from '@/lib/types';
import { fmtDateTime, fmtVnd, parseLocation } from '@/lib/organizer-utils';
import { getEventStatusTag } from '@/components/event-card';
import { EventHubNav } from '@/components/organizer/event-hub-nav';
import { CheckinLivePanel } from '@/components/organizer/checkin-live-panel';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EventHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [event, setEvent] = useState<OrganizerEventSummary | null>(null);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      organizerApi.getEvent(id),
      organizerApi.getAnalytics(id).catch(() => null),
      ticketTypeApi.list(id).catch(() => []),
      staffApi.list(id).catch(() => []),
    ])
      .then(([ev, an, types, staffList]) => {
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
        });
        setAnalytics(an);
      })
      .catch(() => toast.error('Failed to load event'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePublish() {
    setPublishing(true);
    try {
      await organizerApi.updateEventStatus(id, 'published');
      toast.success('Event published!');
      const [ev, an, types, staffList] = await Promise.all([
        organizerApi.getEvent(id),
        organizerApi.getAnalytics(id).catch(() => null),
        ticketTypeApi.list(id).catch(() => []),
        staffApi.list(id).catch(() => []),
      ]);
      setEvent({
        ...ev,
        ticketsSold: types.reduce((s, t) => s + t.soldQty, 0),
        totalCapacity: types.reduce((s, t) => s + t.totalQty, 0),
        revenue: an?.totalRevenue ?? 0,
        checkInRate: an?.checkInRate ?? 0,
        ticketTypeCount: types.length,
        staffCount: staffList.length,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this event? This action cannot be undone and will notify all customers.')) return;
    setPublishing(true);
    try {
      await organizerApi.updateEventStatus(id, 'cancelled');
      toast.success('Event cancelled successfully!');
      const [ev, an, types, staffList] = await Promise.all([
        organizerApi.getEvent(id),
        organizerApi.getAnalytics(id).catch(() => null),
        ticketTypeApi.list(id).catch(() => []),
        staffApi.list(id).catch(() => []),
      ]);
      setEvent({
        ...ev,
        ticketsSold: types.reduce((s, t) => s + t.soldQty, 0),
        totalCapacity: types.reduce((s, t) => s + t.totalQty, 0),
        revenue: an?.totalRevenue ?? 0,
        checkInRate: an?.checkInRate ?? 0,
        ticketTypeCount: types.length,
        staffCount: staffList.length,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted rounded-2xl animate-pulse" />
        <div className="h-48 bg-muted rounded-3xl animate-pulse" />
      </div>
    );
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/organizer/events"
            className="text-sm font-bold text-muted-foreground hover:text-primary"
          >
            ← My Events
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-2">{event.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className={`rounded-full font-bold ${tag.className}`}>
              {tag.label}
            </Badge>
            <Badge variant="secondary" className="rounded-full font-bold">
              {event.category}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {event.status === 'draft' && (
            <Button
              className="rounded-2xl font-bold"
              disabled={publishing}
              onClick={() => void handlePublish()}
            >
              <Rocket className="size-4 mr-2" />
              Publish
            </Button>
          )}
          {(event.status === 'published' || event.status === 'ongoing') && (
            <Button
              variant="destructive"
              className="rounded-2xl font-bold"
              disabled={publishing}
              onClick={() => void handleCancel()}
            >
              <XCircle className="size-4 mr-2" />
              Cancel Event
            </Button>
          )}
          <Link
            href={`/events/${event.id}`}
            target="_blank"
            className={buttonVariants({ variant: 'outline', className: 'rounded-2xl font-bold' })}
          >
            <ExternalLink className="size-4 mr-2" />
            Public page
          </Link>
        </div>
      </div>

      <EventHubNav eventId={id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {event.bannerUrl && (
            <div className="rounded-3xl overflow-hidden border-2 border-border aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.bannerUrl}
                alt={event.name}
                className="size-full object-cover"
              />
            </div>
          )}

          <Card className="rounded-3xl border-2">
            <CardHeader>
              <CardTitle>Event details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm font-medium text-muted-foreground">
              <div className="space-y-2">
                <p>
                  <span className="font-bold text-foreground">When: </span>
                  {fmtDateTime(event.startTime)} → {fmtDateTime(event.endTime)}
                </p>
                <p>
                  <span className="font-bold text-foreground">Where: </span>
                  {parseLocation(event.location)}
                </p>
              </div>

              {event.location && (() => {
                try {
                  const loc = JSON.parse(event.location);
                  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                    return (
                      <div className="rounded-2xl overflow-hidden border-2 border-border border-b-4 w-full">
                        <LocationMap position={{ lat: loc.lat, lng: loc.lng }} readOnly />
                      </div>
                    );
                  }
                } catch { return null; }
                return null;
              })()}

              {event.description && (
                <p className="pt-2 text-foreground/80 whitespace-pre-wrap">
                  {event.description}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-3xl border-2">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Revenue
                </p>
                <p className="text-xl font-extrabold mt-1 flex items-center gap-2">
                  <Wallet className="size-5 text-primary" />
                  {fmtVnd(event.revenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-2">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Tickets sold
                </p>
                <p className="text-xl font-extrabold mt-1 flex items-center gap-2">
                  <Ticket className="size-5 text-primary" />
                  {event.ticketsSold}
                  {event.totalCapacity > 0 && (
                    <span className="text-sm text-muted-foreground">
                      / {event.totalCapacity}
                    </span>
                  )}
                </p>
                {event.totalCapacity > 0 && (
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${soldPct}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-2">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Staff
                </p>
                <p className="text-xl font-extrabold mt-1 flex items-center gap-2">
                  <UserCog className="size-5 text-primary" />
                  {event.staffCount}
                </p>
                <Link
                  href={`/organizer/events/${id}/staff`}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Manage →
                </Link>
              </CardContent>
            </Card>
          </div>

          {analytics && analytics.ticketTypeStats.length > 0 && (
            <Card className="rounded-3xl border-2 border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                  <Ticket className="size-5 text-primary" />
                  Sales by ticket type
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {analytics.ticketTypeStats.map((tt) => (
                    <div key={tt.ticketTypeId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-muted/20 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm border border-primary/20 shrink-0">
                          {tt.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-base">{tt.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-semibold bg-muted/30 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                        <div className="flex flex-col items-end min-w-[4rem]">
                          <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-extrabold mb-0.5">Sold</span>
                          <span className="text-foreground">{tt.sold}</span>
                        </div>
                        <div className="h-8 w-px bg-border/80 hidden sm:block" />
                        <div className="flex flex-col items-end min-w-[6rem]">
                          <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-extrabold mb-0.5">Revenue</span>
                          <span className="text-primary font-bold">{fmtVnd(tt.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {(event.status === 'ongoing' || event.status === 'ended') && (
            <CheckinLivePanel
              eventId={id}
              checkInRate={event.checkInRate}
              ticketsSold={event.ticketsSold}
            />
          )}
          {event.status !== 'ongoing' && event.status !== 'ended' && (
            <Card className="rounded-3xl border-2">
              <CardHeader>
                <CardTitle className="text-base">To-do</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm font-semibold">
                {event.ticketTypeCount === 0 && (
                  <Link
                    href={`/organizer/events/${id}/ticket-types/create`}
                    className="block rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 hover:bg-amber-100 transition-colors"
                  >
                    Add ticket types before publishing
                  </Link>
                )}
                {event.staffCount === 0 && event.status !== 'draft' && (
                  <Link
                    href={`/organizer/events/${id}/staff`}
                    className="block rounded-2xl bg-muted p-3 hover:bg-muted/80 transition-colors"
                  >
                    Assign check-in staff
                  </Link>
                )}
                <Link
                  href={`/organizer/events/${id}/analytics`}
                  className="block rounded-2xl bg-muted p-3 hover:bg-muted/80 transition-colors"
                >
                  View detailed analytics →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
