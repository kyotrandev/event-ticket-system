'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  Receipt,
  Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { bookingApi, ticketApi } from '@/lib/api';
import type { Booking, Ticket as TicketModel } from '@/lib/types';
import {
  BOOKING_STATUS_DESCRIPTIONS,
  fmtDate,
  fmtDateTime,
  fmtVnd,
  getPrimaryEvent,
  getTicketCount,
  parseLocation,
  shortBookingId,
} from '@/lib/booking-utils';
import { BookingStatusBadge } from '@/components/customer/booking-status-badge';
import { BookingCountdown } from '@/components/customer/booking-countdown';
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

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<TicketModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [bk, allTickets] = await Promise.all([
          bookingApi.findById(id),
          ticketApi.findMine().catch(() => [] as TicketModel[]),
        ]);
        setBooking(bk);
        const itemIds = new Set(bk.items?.map((i) => i.id) ?? []);
        setTickets(
          allTickets.filter((t) => itemIds.has(t.bookingItemId)),
        );
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Booking not found');
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
    setCancelling(true);
    try {
      await bookingApi.cancel(booking.id);
      setBooking({ ...booking, status: 'refunded' });
      setTickets((prev) =>
        prev.map((t) => ({ ...t, status: 'cancelled' as const })),
      );
      toast.success('Booking cancelled. Refund has been initiated.');
      setShowCancelDialog(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Loading booking…</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-4">
        <Link
          href="/my-bookings"
          className={buttonVariants({ variant: 'ghost', className: 'rounded-2xl font-bold -ml-2' })}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to bookings
        </Link>
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 border border-destructive/20">
          {error ?? 'Booking not found'}
        </div>
      </div>
    );
  }

  const canPay = booking.status === 'pending_payment';
  const canCancelPaid = booking.status === 'paid';
  const canCancelPending = booking.status === 'pending_payment';
  const ticketCount = getTicketCount(booking);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 pb-16">
      <Link
        href="/my-bookings"
        className={buttonVariants({ variant: 'ghost', className: 'rounded-2xl font-bold -ml-2' })}
      >
        <ArrowLeft className="size-4 mr-2" />
        Back to bookings
      </Link>

      {/* Hero */}
      <div className="rounded-3xl border-2 border-border overflow-hidden bg-background shadow-sm">
        <div className="relative aspect-[16/5] bg-muted">
          {event?.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.bannerUrl}
              alt={event.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <BookingStatusBadge status={booking.status} />
              <span className="text-xs font-mono opacity-80">
                #{shortBookingId(booking.id)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              {event?.name ?? 'Booking details'}
            </h1>
            {event && (
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/90 font-medium">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {fmtDateTime(event.startTime)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {parseLocation(event.location)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status banner */}
      <Card className="border-2 rounded-2xl">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold">{BOOKING_STATUS_DESCRIPTIONS[booking.status]}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ordered {fmtDate(booking.createdAt)} · {ticketCount} ticket
              {ticketCount !== 1 ? 's' : ''}
            </p>
          </div>
          {canPay && <BookingCountdown expiresAt={booking.expiresAt} />}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="size-5 text-primary" />
                Order items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/60"
                >
                  <div>
                    <p className="font-bold">{item.ticketType?.name ?? 'Ticket'}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {fmtVnd(item.unitPrice)}
                    </p>
                  </div>
                  <p className="font-extrabold">
                    {fmtVnd(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}

              <div className="pt-3 space-y-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmtVnd(booking.subtotalAmount)}</span>
                </div>
                {booking.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                    <span>Discount</span>
                    <span>−{fmtVnd(booking.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold pt-1">
                  <span>Total</span>
                  <span>{fmtVnd(booking.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {tickets.length > 0 && (
            <Card className="border-2 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ticket className="size-5 text-primary" />
                  Your tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/my-tickets/${t.code}`}
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
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          <Card className="border-2 rounded-2xl sticky top-36">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canPay && (
                <Link
                  href={`/bookings/${booking.id}/pay`}
                  className={buttonVariants({ className: 'w-full rounded-2xl font-bold' })}
                >
                  Pay now
                </Link>
              )}
              {booking.status === 'paid' && (
                <Link
                  href="/my-tickets"
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full rounded-2xl font-bold',
                  })}
                >
                  View all tickets
                </Link>
              )}
              {event && (
                <Link
                  href={`/events/${event.id}`}
                  className={buttonVariants({
                    variant: 'ghost',
                    className: 'w-full rounded-2xl font-bold',
                  })}
                >
                  View event page
                </Link>
              )}
              {(canCancelPaid || canCancelPending) && (
                <Button
                  variant="destructive"
                  className="w-full rounded-2xl font-bold"
                  disabled={cancelling}
                  onClick={() => setShowCancelDialog(true)}
                >
                  {canCancelPaid ? 'Cancel & refund' : 'Cancel booking'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Order info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  Order ID
                </p>
                <p className="font-mono text-xs mt-1 break-all">{booking.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  Placed on
                </p>
                <p className="font-medium mt-1">{fmtDateTime(booking.createdAt)}</p>
              </div>
              {booking.status === 'pending_payment' && (
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    Hold expires
                  </p>
                  <p className="font-medium mt-1">{fmtDateTime(booking.expiresAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canCancelPaid ? 'Cancel and request refund?' : 'Cancel this booking?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canCancelPaid
                ? 'Your tickets will be invalidated and a full refund will be sent to your original payment method. This cannot be undone.'
                : 'Your reserved seats will be released. No payment has been made yet.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep booking</AlertDialogCancel>
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
