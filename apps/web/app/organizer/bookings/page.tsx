'use client';

import { useCallback, useEffect, useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { organizerApi } from '@/lib/api';
import type { BookingStatus, OrganizerBookingSummary } from '@/lib/types';
import { OrganizerBookingsTable } from '@/components/organizer/organizer-bookings-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

export default function OrganizerBookingsPage() {
  const [bookings, setBookings] = useState<OrganizerBookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [status, setStatus] = useState<string>('all');
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApi.getBookings({
        page,
        limit: 20,
        status: status === 'all' ? undefined : (status as BookingStatus),
      });
      let data = res.data;
      const q = keyword.trim().toLowerCase();
      if (q) {
        data = data.filter(
          (b) =>
            b.eventName.toLowerCase().includes(q) ||
            b.customerName.toLowerCase().includes(q) ||
            b.customerEmail.toLowerCase().includes(q) ||
            b.id.toLowerCase().includes(q),
        );
      }
      setBookings(data);
      setHasNextPage(res.hasNextPage);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, status, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-2xl">
          <Receipt className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Event Bookings</h1>
          <p className="text-muted-foreground font-medium">
            All customer orders across your events.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search event, customer, order ID…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9 rounded-2xl border-2 h-11"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v ?? 'all'); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48 rounded-2xl border-2 h-11 font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading bookings…</p>
      ) : (
        <OrganizerBookingsTable bookings={bookings} />
      )}

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          className="rounded-2xl font-bold"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <span className="flex items-center px-3 text-sm font-bold text-muted-foreground">
          Page {page}
        </span>
        <Button
          variant="outline"
          className={cn('rounded-2xl font-bold')}
          disabled={!hasNextPage || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
