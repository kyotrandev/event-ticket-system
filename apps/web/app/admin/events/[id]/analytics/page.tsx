'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { organizerApi } from '@/lib/api';
import { EventHubNav } from '@/components/organizer/event-hub-nav';
import type { EventAnalytics } from '@/lib/types';
import { fmtVnd } from '@/lib/organizer-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminEventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    organizerApi
      .getAnalytics(id)
      .then(setAnalytics)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load analytics'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const maxDailyBookings = analytics
    ? Math.max(1, ...analytics.dailyBookings.map((d) => d.bookings))
    : 1;

  return (
    <div className="space-y-6">
      <Link href={`/admin/events/${id}`} className="text-sm font-bold text-muted-foreground hover:text-primary">
        ← Event overview
      </Link>
      <EventHubNav eventId={id} basePath="/admin/events" variant="admin" />
      <h1 className="text-2xl font-extrabold">Analytics</h1>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
      )}

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {analytics && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-2 rounded-2xl">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold">{fmtVnd(analytics.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-2 rounded-2xl">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Check-in rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold">{analytics.checkInRate}%</p>
              </CardContent>
            </Card>
            <Card className="border-2 rounded-2xl">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">Ticket types</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold">{analytics.ticketTypeStats.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Daily bookings (30d)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analytics.dailyBookings.length === 0 ? (
                <p className="text-muted-foreground text-sm">No bookings yet.</p>
              ) : (
                analytics.dailyBookings.map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-muted-foreground shrink-0">{d.date}</span>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded flex items-center px-2"
                        style={{
                          width: `${Math.max(8, Math.round((d.bookings / maxDailyBookings) * 100))}%`,
                        }}
                      >
                        <span className="text-xs text-primary-foreground font-medium">
                          {d.bookings}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted-foreground w-28 text-right shrink-0">
                      {fmtVnd(d.revenue)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
