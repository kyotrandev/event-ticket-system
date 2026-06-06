'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminStats } from '@/lib/types';

function fmt(n: number) {
  return n.toLocaleString();
}
function fmtVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className="font-medium">
          {fmt(value)} <span className="text-muted-foreground text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load stats'));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">System Stats</h1>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {!stats && !error && <p className="text-muted-foreground">Loading…</p>}

      {stats && (
        <div className="space-y-8">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={fmt(stats.users.total)} />
            <StatCard
              title="Gross Revenue"
              value={fmtVnd(stats.totalGrossRevenue)}
              sub={`Refunds: ${fmtVnd(stats.totalRefunds)}`}
            />
            <StatCard
              title="Paid Bookings"
              value={fmt(stats.bookings.paid)}
              sub={`Refunded: ${fmt(stats.bookings.refunded)}`}
            />
            <StatCard
              title="Published Events"
              value={fmt(stats.events.published + stats.events.ongoing)}
              sub={`Ongoing: ${fmt(stats.events.ongoing)}`}
            />
          </div>

          {/* Breakdowns */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Users by Role</CardTitle>
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Events by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['published', 'ongoing', 'draft', 'ended', 'cancelled'] as const).map((s) => {
                  const total = Object.values(stats.events).reduce((a, b) => a + b, 0);
                  return <BreakdownRow key={s} label={s} value={stats.events[s]} total={total} />;
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bookings by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  ['paid', 'pendingPayment', 'refunded', 'expired', 'failed'] as const
                ).map((s) => {
                  const total = Object.values(stats.bookings).reduce((a, b) => a + b, 0);
                  const label = s === 'pendingPayment' ? 'pending' : s;
                  return (
                    <BreakdownRow key={s} label={label} value={stats.bookings[s]} total={total} />
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
