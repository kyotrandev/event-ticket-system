'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Receipt, Search } from 'lucide-react';
import { bookingApi } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { filterBookings, type BookingFilter } from '@/lib/booking-utils';
import { BookingCard } from '@/components/customer/booking-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FILTERS: { id: BookingFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'past', label: 'Past' },
];

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    bookingApi
      .findMine()
      .then(setBookings)
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending_payment').length;
    const paid = bookings.filter((b) => b.status === 'paid').length;
    return { total: bookings.length, pending, paid };
  }, [bookings]);

  const visible = useMemo(() => {
    const list = filterBookings(bookings, filter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((b) => {
      const eventName =
        b.items?.[0]?.ticketType?.event?.name?.toLowerCase() ?? '';
      return eventName.includes(q) || b.id.toLowerCase().includes(q);
    });
  }, [bookings, filter, search]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Loading your bookings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2.5 rounded-2xl">
              <Receipt className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">My Bookings</h1>
          </div>
          <p className="text-muted-foreground font-medium">
            Track orders, payments, and refunds in one place.
          </p>
        </div>
        <Link
          href="/events"
          className={buttonVariants({ className: 'rounded-2xl font-bold' })}
        >
          Browse events
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total orders', value: stats.total },
          { label: 'Awaiting payment', value: stats.pending },
          { label: 'Confirmed', value: stats.paid },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border-2 border-border bg-background p-4 text-center"
          >
            <p className="text-2xl font-extrabold">{item.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by event or order ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-2xl border-2 h-11 font-medium"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              variant={filter === f.id ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'rounded-2xl font-bold border-2',
                filter === f.id && 'border-primary',
              )}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm font-medium border border-destructive/20">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-16 space-y-4 rounded-3xl border-2 border-dashed border-border bg-muted/20">
          <Receipt className="size-12 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-bold text-lg">No bookings found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {bookings.length === 0
                ? 'You have not placed any orders yet.'
                : 'Try a different filter or search term.'}
            </p>
          </div>
          {bookings.length === 0 && (
            <Link href="/events" className={buttonVariants({ className: 'rounded-2xl font-bold' })}>
              Find an event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
