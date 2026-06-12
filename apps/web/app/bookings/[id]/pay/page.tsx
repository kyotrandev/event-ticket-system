'use client';

import { use, useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { ApiError, bookingApi, paymentApi } from '@/lib/api';
import { useDeferredEffect } from '@/lib/use-deferred-effect';
import type { Booking, CreateIntentResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
);

function formatVnd(amount: number): string {
  return amount === 0
    ? 'Free'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
        amount,
      );
}

// Module-level stable refs — no useCallback needed, no closure over component state.
let currentNow = Date.now();
function subscribeToTimer(cb: () => void) {
  currentNow = Date.now();
  const id = setInterval(() => {
    currentNow = Date.now();
    cb();
  }, 1000);
  return () => clearInterval(id);
}
function getTimerSnapshot() {
  return currentNow;
}

function useCountdown(expiresAt: string | null) {
  const now = useSyncExternalStore(subscribeToTimer, getTimerSnapshot, () => 0);
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

function PaymentForm({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${origin}/bookings/${bookingId}/success`,
      },
    });
    if (error) {
      toast.error(error.message ?? 'Payment failed');
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={paying || !stripe} className="w-full">
        {paying ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  );
}

export default function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [intent, setIntent] = useState<CreateIntentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intentFetched = useRef(false);

  const countdown = useCountdown(booking?.expiresAt ?? null);

  const load = useCallback(async () => {
    try {
      const b = await bookingApi.findById(id);
      setBooking(b);

      if (b.status === 'paid') {
        router.replace(`/bookings/${id}/success`);
        return;
      }
      if (b.status === 'expired' || b.status === 'failed') {
        setError('Booking has expired or failed. Please create a new booking.');
        setLoading(false);
        return;
      }

      if (!intentFetched.current) {
        intentFetched.current = true;
        const intentRes = await paymentApi.createIntent(id);
        if (intentRes.status === 'paid') {
          router.replace(`/bookings/${id}/success`);
          return;
        }
        setIntent(intentRes);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  if (!booking || !intent) return null;

  const expired = countdown !== null && countdown === 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Complete your payment</h1>

      {/* Booking summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
          <CardDescription>
            {expired ? (
              <span className="text-destructive font-medium">Booking expired</span>
            ) : countdown !== null ? (
              <span className={countdown < 60 ? 'text-destructive font-medium' : ''}>
                Expires in {Math.floor(countdown / 60)}:
                {String(countdown % 60).padStart(2, '0')}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {booking.items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.ticketType?.name ?? 'Ticket'} × {item.quantity}
              </span>
              <span>{formatVnd(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          {booking.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−{formatVnd(booking.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatVnd(booking.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stripe payment form */}
      {expired ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Your booking has expired. Please return to the event and book again.
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      ) : intent.clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: intent.clientSecret }}
        >
          <PaymentForm
            bookingId={id}
            onSuccess={() => router.push(`/bookings/${id}/success`)}
          />
        </Elements>
      ) : null}
    </div>
  );
}
