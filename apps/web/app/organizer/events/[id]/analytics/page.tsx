'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import type { EventAnalytics } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

function fmtVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function EventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      const role = user.role?.id;
      if (role !== RoleId.Organizer && role !== RoleId.Admin) {
        router.replace('/');
      }
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user && id) {
      organizerApi
        .getAnalytics(id)
        .then(setAnalytics)
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : 'Failed to load analytics'),
        )
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const maxRevenue =
    analytics ? Math.max(1, ...analytics.ticketTypeStats.map((t) => t.revenue)) : 1;
  const maxDailyBookings =
    analytics ? Math.max(1, ...analytics.dailyBookings.map((d) => d.bookings)) : 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Event Analytics</h1>
        <Link
          href="/organizer/events"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          ← My Events
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
      )}

      {analytics && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard title="Total Revenue" value={fmtVnd(analytics.totalRevenue)} />
            <StatCard title="Check-in Rate" value={`${analytics.checkInRate}%`} />
            <StatCard
              title="Ticket Types Sold"
              value={String(analytics.ticketTypeStats.length)}
            />
          </div>

          {/* Check-in progress bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Check-in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${analytics.checkInRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {analytics.checkInRate}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ticket type breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sales by Ticket Type</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.ticketTypeStats.length === 0 ? (
                <p className="text-muted-foreground text-sm">No sales yet.</p>
              ) : (
                <div className="space-y-4">
                  {analytics.ticketTypeStats.map((tt) => (
                    <div key={tt.ticketTypeId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{tt.name}</span>
                        <span className="text-muted-foreground">
                          {tt.sold} sold · {fmtVnd(tt.revenue)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full"
                          style={{ width: `${Math.round((tt.revenue / maxRevenue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily bookings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.dailyBookings.length === 0 ? (
                <p className="text-muted-foreground text-sm">No bookings yet.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.dailyBookings.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-sm">
                      <span className="w-24 text-muted-foreground shrink-0">{d.date}</span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded flex items-center px-2"
                          style={{
                            width: `${Math.max(
                              8,
                              Math.round((d.bookings / maxDailyBookings) * 100),
                            )}%`,
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top promo codes */}
          {analytics.topPromoCodes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Promo Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 text-left font-medium">Code</th>
                        <th className="py-1 text-right font-medium">Uses</th>
                        <th className="py-1 text-right font-medium">Total Discount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.topPromoCodes.map((p) => (
                        <tr key={p.code}>
                          <td className="py-2 font-mono">{p.code}</td>
                          <td className="py-2 text-right">{p.usageCount}</td>
                          <td className="py-2 text-right">{fmtVnd(p.totalDiscount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
