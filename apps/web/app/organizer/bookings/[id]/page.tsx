'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, User } from 'lucide-react';
import { toast } from 'sonner';
import { bookingApi, organizerApi, ticketApi } from '@/lib/api';
import type { Booking, Ticket } from '@/lib/types';
import {
  BOOKING_STATUS_DESCRIPTIONS,
  BOOKING_STATUS_LABELS,
  fmtDateTime,
  fmtVnd,
  getPrimaryEvent,
  getTicketCount,
  shortBookingId,
} from '@/lib/booking-utils';
import { BookingStatusBadge } from '@/components/customer/booking-status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function OrganizerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [customerLabel, setCustomerLabel] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bk, tix, summaryRes] = await Promise.all([
          bookingApi.findById(id),
          ticketApi.findByBooking(id).catch(() => [] as Ticket[]),
          organizerApi.getBookings({ limit: 50 }).catch(() => ({ data: [] })),
        ]);
        setBooking(bk);
        setTickets(tix);
        const summary = summaryRes.data.find((b) => b.id === id);
        if (summary) {
          setCustomerLabel(`${summary.customerName} · ${summary.customerEmail}`);
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Not found');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  const event = useMemo(
    () => (booking ? getPrimaryEvent(booking) : null),
    [booking],
  );

  async function handleCancel() {
    if (!booking) return;
    const wasPending = booking.status === 'pending_payment';
    setCancelling(true);
    try {
      await bookingApi.cancel(booking.id);
      setBooking({
        ...booking,
        status: wasPending ? 'expired' : 'refunded',
      });
      if (!wasPending) {
        setTickets((prev) =>
          prev.map((t) => ({ ...t, status: 'cancelled' as const })),
        );
        toast.success('Booking cancelled and refund initiated.');
      } else {
        toast.success('Pending booking cancelled. Seats released.');
      }
      setShowCancelDialog(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading booking…</p>;
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Link
          href="/organizer/bookings"
          className={buttonVariants({ variant: 'ghost', className: 'rounded-2xl font-bold -ml-2' })}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to bookings
        </Link>
        <p className="text-destructive">{error ?? 'Booking not found'}</p>
      </div>
    );
  }

  const canCancelPaid = booking.status === 'paid';
  const canCancelPending = booking.status === 'pending_payment';

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/organizer/bookings"
        className={buttonVariants({ variant: 'ghost', className: 'rounded-2xl font-bold -ml-2' })}
      >
        <ArrowLeft className="size-4 mr-2" />
        Back to bookings
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Order #{shortBookingId(booking.id)}</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <p className="text-muted-foreground">{BOOKING_STATUS_DESCRIPTIONS[booking.status]}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {customerLabel ? (
              <p className="font-bold">{customerLabel}</p>
            ) : (
              <p className="font-bold">Customer ID {booking.customerId}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event</span>
              <span className="font-bold text-right max-w-[60%] truncate">
                {event?.name ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Placed</span>
              <span>{fmtDateTime(booking.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tickets</span>
              <span>{getTicketCount(booking)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold pt-2 border-t">
              <span>Total</span>
              <span>{fmtVnd(booking.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 rounded-2xl">
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {booking.items?.map((item) => (
            <div
              key={item.id}
              className="flex justify-between p-3 rounded-xl bg-muted/40"
            >
              <span>
                {item.quantity}× {item.ticketType?.name ?? 'Ticket'}
              </span>
              <span className="font-bold">
                {fmtVnd(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {tickets.length > 0 && (
        <Card className="border-2 rounded-2xl">
          <CardHeader>
            <CardTitle>Tickets in this order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/organizer/tickets/${t.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-mono text-sm font-bold">{t.code.slice(0, 13)}…</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.status}</p>
                </div>
                <ExternalLink className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {(canCancelPaid || canCancelPending) && (
        <Card className="border-2 border-destructive/30 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Organizer actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {canCancelPaid
                ? 'Cancel this paid order, invalidate tickets, and refund the customer via Stripe.'
                : 'Release held seats for this unpaid order.'}
            </p>
            <Button
              variant="destructive"
              className="rounded-2xl font-bold"
              disabled={cancelling}
              onClick={() => setShowCancelDialog(true)}
            >
              {canCancelPaid ? 'Cancel & refund' : 'Cancel pending order'}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Status: {BOOKING_STATUS_LABELS[booking.status]}
      </p>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canCancelPaid ? 'Cancel and refund this order?' : 'Cancel this pending order?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canCancelPaid
                ? 'All tickets will be invalidated and the customer will receive a full refund. This cannot be undone.'
                : 'Reserved seats will be released. No payment has been captured.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Processing…' : 'Yes, cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
