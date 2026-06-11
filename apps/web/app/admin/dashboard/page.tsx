'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Radio,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { fmtVnd } from '@/lib/organizer-utils';
import type { AdminStats, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-2 border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <div className="bg-primary/10 p-2 rounded-xl shrink-0">
            <Icon className="size-4 text-primary" />
          </div>
        </div>
        <p className="text-2xl font-extrabold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className="font-medium">
          {fmt(value)}{' '}
          <span className="text-muted-foreground text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getPendingOrganizers(1, 5),
    ])
      .then(([s, p]) => {
        setStats(s);
        setPending(p.data);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load dashboard'),
      );
  }, []);

  const maxDailyBookings = stats
    ? Math.max(1, ...stats.dailyStats.map((d) => d.bookings))
    : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System-wide overview — users, events, revenue, and bookings.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm">
          {error}
        </div>
      )}

      {!stats && !error && (
        <p className="text-muted-foreground text-sm">Loading dashboard…</p>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={fmt(stats.users.total)}
              sub={`${stats.users.organizer} organizers · ${stats.users.customer} customers`}
              icon={Users}
            />
            <StatCard
              title="Net Revenue"
              value={fmtVnd(stats.netRevenue)}
              sub={`Gross ${fmtVnd(stats.totalGrossRevenue)} · Refunds ${fmtVnd(stats.totalRefunds)}`}
              icon={Wallet}
            />
            <StatCard
              title="Tickets Sold"
              value={fmt(stats.totalTicketsSold)}
              sub={`${fmt(stats.bookings.paid)} paid bookings`}
              icon={Ticket}
            />
            <StatCard
              title="Live Events"
              value={fmt(stats.liveEvents)}
              sub={`${fmt(stats.events.published)} published · ${fmt(stats.events.draft)} drafts`}
              icon={Radio}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Users by Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['customer', 'organizer', 'staff', 'admin'] as const).map((role) => (
                  <BreakdownRow
                    key={role}
                    label={role}
                    value={stats.users[role]}
                    total={stats.users.total}
                  />
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  Events by Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['published', 'ongoing', 'draft', 'ended', 'cancelled'] as const).map((s) => {
                  const total = Object.values(stats.events).reduce((a, b) => a + b, 0);
                  return (
                    <BreakdownRow key={s} label={s} value={stats.events[s]} total={total} />
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Bookings by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  ['paid', 'pendingPayment', 'refunded', 'expired', 'failed'] as const
                ).map((s) => {
                  const total = Object.values(stats.bookings).reduce((a, b) => a + b, 0);
                  const label = s === 'pendingPayment' ? 'pending payment' : s;
                  return (
                    <BreakdownRow
                      key={s}
                      label={label}
                      value={stats.bookings[s]}
                      total={total}
                    />
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-2 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  Daily Revenue (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.dailyStats.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No paid bookings in the last 30 days.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {stats.dailyStats.map((d) => (
                      <div key={d.date} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-muted-foreground shrink-0 text-xs">{d.date}</span>
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded flex items-center px-2 min-w-[2rem]"
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
                        <span className="text-muted-foreground w-28 text-right shrink-0 text-xs">
                          {fmtVnd(d.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="size-4" />
                  Pending Organizers
                </CardTitle>
                {stats.pendingOrganizers > 0 && (
                  <Badge>{stats.pendingOrganizers}</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {pending.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No pending applications.</p>
                ) : (
                  pending.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-2xl border p-3 text-sm space-y-0.5"
                    >
                      <p className="font-semibold">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-muted-foreground text-xs truncate">{u.email}</p>
                      {u.companyName && (
                        <p className="text-xs text-muted-foreground">{u.companyName}</p>
                      )}
                    </div>
                  ))
                )}
                {stats.pendingOrganizers > 0 && (
                  <Link
                    href="/admin/organizers/pending"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    Review all
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
