'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { bookingApi } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';

export default function SuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const redirectStatus = searchParams.get('redirect_status');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingApi
      .findById(id)
      .then(setBooking)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  const failed =
    redirectStatus === 'failed' ||
    (booking && booking.status !== 'paid' && !loading);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <p className="text-muted-foreground">Verifying payment…</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4 text-center">
        <XCircle className="mx-auto size-12 text-destructive" />
        <h1 className="text-2xl font-bold">Payment failed</h1>
        <p className="text-muted-foreground text-sm">
          Your payment could not be processed. You can try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/bookings/${id}/pay`}
            className={buttonVariants()}
          >
            Try again
          </Link>
          <Link href="/events" className={buttonVariants({ variant: 'outline' })}>
            Browse events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-4 text-center">
      <CheckCircle className="mx-auto size-12 text-green-500" />
      <h1 className="text-2xl font-bold">Booking confirmed!</h1>
      <p className="text-muted-foreground text-sm">
        Your tickets are on the way. Check your email for the QR codes.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/my-tickets" className={buttonVariants()}>
          View my tickets
        </Link>
        <Link href="/events" className={buttonVariants({ variant: 'outline' })}>
          Browse more events
        </Link>
      </div>
    </div>
  );
}
