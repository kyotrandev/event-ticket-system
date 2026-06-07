'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingApi } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  expired: 'Expired',
  failed: 'Failed',
  refunded: 'Refunded',
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'paid') return 'default';
  if (status === 'pending_payment') return 'secondary';
  if (status === 'failed') return 'destructive';
  return 'outline';
}

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
      <div className="page-shell max-w-3xl">
        <div className="vibrant-card p-6 font-semibold text-muted-foreground">
          Loading bookings...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div>
        <p className="vibrant-chip inline-flex">Customer</p>
        <h1 className="display-play mt-3 text-6xl leading-[0.9]">My bookings</h1>
      </div>

      {error && (
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      {bookings.length === 0 && (
        <p className="vibrant-card p-6 font-semibold text-muted-foreground">
          No bookings yet.{' '}
          <Link href="/events" className="underline">
            Browse events
          </Link>
        </p>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-mono text-sm text-muted-foreground">
                  {booking.id.slice(0, 8)}...
                </CardTitle>
                <Badge variant={statusVariant(booking.status)}>
                  {STATUS_LABELS[booking.status] ?? booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 rounded-lg border-2 bg-accent p-4 text-sm font-black sm:grid-cols-2">
                <div>
                  <span>Total</span>
                  <p>{booking.totalAmount.toLocaleString()} VND</p>
                </div>
                <div>
                  <span>Date</span>
                  <p>{new Date(booking.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {booking.status === 'pending_payment' && (
                  <Link
                    href={`/bookings/${booking.id}/pay`}
                    className={buttonVariants({ size: 'sm' })}
                  >
                    Pay now
                  </Link>
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
                      {cancelling === booking.id ? 'Cancelling...' : 'Cancel & Refund'}
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
