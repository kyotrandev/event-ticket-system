'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Tag, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, bookingApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { EventModel, TicketType } from '@/lib/types';
import { formatDateTime } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function formatVnd(amount: number): string {
  return amount === 0
    ? 'Free'
    : new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount);
}

function remaining(t: TicketType): number {
  return Math.max(0, t.totalQty - t.soldQty - t.reservedQty);
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventModel | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ev = await api.get<EventModel>(`/events/${id}`, undefined, false);
        if (cancelled) return;
        if (!ev) {
          setNotFound(true);
          return;
        }
        setEvent(ev);
        const tt = await api.get<TicketType[]>(
          `/events/${id}/ticket-types`,
          undefined,
          false,
        );
        if (!cancelled) setTickets(tt ?? []);
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const subtotal = tickets.reduce((sum, t) => {
    const qty = quantities[t.id] ?? 0;
    return sum + qty * t.price;
  }, 0);
  const selectedCount = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const hasItems = selectedCount > 0;

  async function handleBook() {
    if (!user) {
      router.push('/login');
      return;
    }
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
    if (!items.length) return;

    setBooking(true);
    try {
      const b = await bookingApi.create(items, promoCode || undefined);
      router.push(`/bookings/${b.id}/pay`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Booking failed');
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="vibrant-card p-6 font-semibold text-muted-foreground">
          Loading event...
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="page-shell">
        <div className="vibrant-card p-8">
          <h1 className="text-2xl font-black">Event not found</h1>
        </div>
      </div>
    );
  }

  const eventActive = event.status === 'published' || event.status === 'ongoing';

  return (
    <div className="page-shell space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border-2 bg-muted shadow-[8px_8px_0_var(--secondary)]">
          {event.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.bannerUrl}
              alt={event.name}
              className="size-full object-cover saturate-[1.15]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{event.category}</Badge>
            <Badge variant={eventActive ? 'default' : 'outline'}>{event.status}</Badge>
          </div>
        </div>

        <div className="vibrant-card flex flex-col justify-between p-6">
          <div className="space-y-5">
            {event.status === 'cancelled' && (
              <div className="rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-black text-destructive">
                This event has been cancelled.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {event.tags?.map((t) => (
                <Badge key={t} variant="outline">
                  <Tag className="size-3" />
                  {t}
                </Badge>
              ))}
            </div>
            <div>
              <h1 className="display-play text-6xl leading-[0.9]">{event.name}</h1>
              {event.description && (
                <p className="mt-4 font-semibold leading-7 text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-8 space-y-3 text-sm font-semibold text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-secondary" />
              {event.location}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <div>
            <p className="vibrant-chip inline-flex">Tickets</p>
            <h2 className="mt-3 text-3xl font-black">Choose your pass</h2>
          </div>
          {tickets.length === 0 ? (
            <div className="vibrant-card p-6 font-semibold text-muted-foreground">
              No ticket types are available yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {tickets.map((t) => {
                const left = remaining(t);
                const soldOut = t.status === 'sold_out' || left === 0;
                const closed = t.status === 'closed';
                const upcoming = t.status === 'upcoming';
                const purchasable = eventActive && !soldOut && !closed && !upcoming;
                const qty = quantities[t.id] ?? 0;

                return (
                  <Card key={t.id} className="p-0">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Ticket className="size-5 text-primary" />
                            {t.name}
                          </CardTitle>
                          <CardDescription>
                            {soldOut
                              ? 'Sold out'
                              : closed
                                ? 'Sales closed'
                                : upcoming
                                  ? `Sales open ${new Date(t.saleStart).toLocaleDateString('vi-VN')}`
                                  : `${left} remaining`}
                          </CardDescription>
                        </div>
                        <div className="text-right text-lg font-black">
                          {formatVnd(t.price)}
                        </div>
                      </div>
                    </CardHeader>
                    {purchasable && (
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-3">
                          <Label htmlFor={`qty-${t.id}`}>Quantity</Label>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            type="button"
                            onClick={() =>
                              setQuantities((q) => ({
                                ...q,
                                [t.id]: Math.max(0, (q[t.id] ?? 0) - 1),
                              }))
                            }
                            disabled={qty === 0}
                            aria-label={`Decrease ${t.name} quantity`}
                          >
                            -
                          </Button>
                          <Input
                            id={`qty-${t.id}`}
                            type="number"
                            min={0}
                            max={Math.min(left, event.maxTicketsPerOrder)}
                            value={qty}
                            onChange={(e) =>
                              setQuantities((q) => ({
                                ...q,
                                [t.id]: Math.max(
                                  0,
                                  Math.min(
                                    Number(e.target.value),
                                    left,
                                    event.maxTicketsPerOrder,
                                  ),
                                ),
                              }))
                            }
                            className="w-20 text-center"
                          />
                          <Button
                            variant="outline"
                            size="icon-sm"
                            type="button"
                            onClick={() =>
                              setQuantities((q) => ({
                                ...q,
                                [t.id]: Math.min(
                                  (q[t.id] ?? 0) + 1,
                                  left,
                                  event.maxTicketsPerOrder,
                                ),
                              }))
                            }
                            disabled={qty >= Math.min(left, event.maxTicketsPerOrder)}
                            aria-label={`Increase ${t.name} quantity`}
                          >
                            +
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {eventActive && tickets.some((t) => t.status === 'available') && (
          <aside className="vibrant-card h-fit p-5 lg:sticky lg:top-24">
            <h2 className="text-2xl font-black">Booking summary</h2>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promo">Promo code</Label>
                <Input
                  id="promo"
                  placeholder="Optional"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
              </div>
              <div className="rounded-lg border-2 bg-accent p-4 text-sm font-black">
                <div className="flex justify-between">
                  <span>Tickets</span>
                  <span>{selectedCount}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatVnd(subtotal)}</span>
                </div>
              </div>
              <Button
                onClick={handleBook}
                disabled={!hasItems || booking}
                className="w-full"
              >
                {booking
                  ? 'Creating booking...'
                  : user
                    ? 'Book tickets'
                    : 'Log in to book'}
              </Button>
            </div>
          </aside>
        )}
      </section>
    </div>
  );
}
