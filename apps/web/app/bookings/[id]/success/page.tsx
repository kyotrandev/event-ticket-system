'use client';

import { use, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { bookingApi } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

function SuccessPageInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const redirectStatus = searchParams.get('redirect_status');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  // True while polling loop is running; false once it stops (success, timeout, or error).
  const [pollingActive, setPollingActive] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStart = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBooking(null);
    pollStart.current = Date.now();

    async function fetchBooking() {
      try {
        const b = await bookingApi.findById(id);
        if (cancelled) return;
        setBooking(b);
        setLoading(false);

        const shouldPoll =
          redirectStatus === 'succeeded' &&
          b.status === 'pending_payment' &&
          Date.now() - pollStart.current < POLL_TIMEOUT_MS;

        if (shouldPoll) {
          setPollingActive(true);
          pollTimer.current = setTimeout(fetchBooking, POLL_INTERVAL_MS);
        } else {
          // Polling done: either paid, non-pending status, or 30 s timeout elapsed.
          setPollingActive(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setPollingActive(false);
        }
      }
    }

    fetchBooking();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [id, redirectStatus]);

  // Show spinner while initial fetch is in flight OR while waiting for webhook.
  const waitingForWebhook =
    pollingActive &&
    redirectStatus === 'succeeded' &&
    booking?.status === 'pending_payment';

  const failed =
    redirectStatus === 'failed' ||
    (!loading && !waitingForWebhook && booking && booking.status !== 'paid');

  if (loading || waitingForWebhook) {
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
          <Link href={`/bookings/${id}/pay`} className={buttonVariants()}>
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

export default function SuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-12">
          <p className="text-muted-foreground">Verifying payment…</p>
        </div>
      }
    >
      <SuccessPageInner id={id} />
    </Suspense>
  );
}
