'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingApi } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  expired: 'Expired',
  failed: 'Failed',
  refunded: 'Refunded',
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-blue-100 text-blue-800',
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bookingApi
      .findMine()
      .then(setBookings)
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking and request a refund?')) return;
    setCancelling(id);
    setError(null);
    try {
      await bookingApi.cancel(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'refunded' } : b)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground">Loading bookings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <h1 className="text-2xl font-bold">My Bookings</h1>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      {bookings.length === 0 && (
        <p className="text-muted-foreground">
          No bookings yet.{' '}
          <Link href="/events" className="underline">
            Browse events
          </Link>
        </p>
      )}

      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono text-muted-foreground">
                  {booking.id.slice(0, 8)}…
                </CardTitle>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_LABELS[booking.status] ?? booking.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">
                  {booking.totalAmount.toLocaleString()} VND
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 pt-1">
                {booking.status === 'pending_payment' && (
                  <>
                    <Link
                      href={`/bookings/${booking.id}/pay`}
                      className={buttonVariants({ size: 'sm' })}
                    >
                      Pay now
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancelling === booking.id}
                      onClick={() => void handleCancel(booking.id)}
                    >
                      {cancelling === booking.id ? 'Cancelling…' : 'Cancel'}
                    </Button>
                  </>
                )}
                {booking.status === 'paid' && (
                  <>
                    <Link
                      href="/my-tickets"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      View tickets
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancelling === booking.id}
                      onClick={() => void handleCancel(booking.id)}
                    >
                      {cancelling === booking.id ? 'Cancelling…' : 'Cancel & Refund'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
