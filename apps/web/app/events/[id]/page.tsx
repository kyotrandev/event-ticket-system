'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, bookingApi, waitlistApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { EventModel, TicketType } from '@/lib/types';
import { RoleId } from '@/lib/types';
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
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/LocationPickerMap'), { 
  ssr: false, 
  loading: () => <div className="h-[200px] w-full bg-muted flex items-center justify-center animate-pulse rounded-md border">Loading map...</div> 
});

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

function formatLocalDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isRole } = useAuth();
  const canPurchase = !user || isRole(RoleId.Customer);

  const [event, setEvent] = useState<EventModel | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // qty map: ticketTypeId → quantity
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
        if (!ev) { setNotFound(true); return; }
        setEvent(ev);
        const tt = await api.get<TicketType[]>(`/events/${id}/ticket-types`, undefined, false);
        if (!cancelled) setTickets(tt ?? []);
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const subtotal = tickets.reduce((sum, t) => {
    const qty = quantities[t.id] ?? 0;
    return sum + qty * t.price;
  }, 0);

  const hasItems = Object.values(quantities).some((q) => q > 0);

  async function handleBook() {
    if (!user) { router.push('/login'); return; }
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

  async function handleJoinWaitlist(ticketTypeId: string) {
    if (!user) { router.push('/login'); return; }
    try {
      await waitlistApi.join(ticketTypeId);
      toast.success('Joined waitlist successfully!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to join waitlist');
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-xl font-semibold">Event not found</h1>
      </div>
    );
  }

  const eventActive =
    event.status === 'published' || event.status === 'ongoing';

  let locationAddress = event.location;
  let locationPos: { lat: number; lng: number } | null = null;
  try {
    const parsed = JSON.parse(event.location);
    if (parsed.address) locationAddress = parsed.address;
    if (parsed.lat && parsed.lng) locationPos = { lat: parsed.lat, lng: parsed.lng };
  } catch {
    // raw string
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="bg-muted mb-6 aspect-[21/9] w-full overflow-hidden rounded-lg">
        {event.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.bannerUrl}
            alt={event.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center">
            No image
          </div>
        )}
      </div>

      {event.status === 'cancelled' && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive mb-6 rounded-md border px-4 py-3 text-sm">
          This event has been cancelled.
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{event.category}</Badge>
        {event.tags?.map((t) => (
          <Badge key={t} variant="outline">
            <Tag className="size-3" />
            {t}
          </Badge>
        ))}
      </div>

      <h1 className="mb-4 text-3xl font-bold">{event.name}</h1>

      <div className="text-muted-foreground mb-6 space-y-1.5">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          {formatDateTime(event.startTime)} — {formatDateTime(event.endTime)}
        </p>
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            <span className="line-clamp-2">{locationAddress}</span>
          </p>
          {locationPos && (
            <div className="mt-2 rounded-md overflow-hidden border w-full max-w-md h-[200px]">
              <Map position={locationPos} readOnly />
            </div>
          )}
        </div>
      </div>

      {event.description && (
        <p className="mb-8 whitespace-pre-line leading-relaxed">
          {event.description}
        </p>
      )}

      <h2 className="mb-4 text-xl font-semibold">Tickets</h2>
      {tickets.length === 0 ? (
        <p className="text-muted-foreground">No ticket types are available yet.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const left = remaining(t);
            const soldOut = t.status === 'sold_out' || left === 0;
            const closed = t.status === 'closed';
            const upcoming = t.status === 'upcoming';
            const purchasable = eventActive && !soldOut && !closed && !upcoming;
            const qty = quantities[t.id] ?? 0;

            return (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{t.name}</CardTitle>
                      <CardDescription>
                        {soldOut
                          ? 'Sold out'
                          : closed
                            ? 'Sales closed'
                            : upcoming
                              ? `Sales open ${formatLocalDateTime(t.saleStart)}`
                              : `${left} remaining`}
                      </CardDescription>
                    </div>
                    <div className="text-lg font-semibold">{formatVnd(t.price)}</div>
                  </div>
                </CardHeader>
                {purchasable && canPurchase && (
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Label htmlFor={`qty-${t.id}`} className="shrink-0">
                        Qty
                      </Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            setQuantities((q) => ({
                              ...q,
                              [t.id]: Math.max(0, (q[t.id] ?? 0) - 1),
                            }))
                          }
                          disabled={qty === 0}
                        >
                          −
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
                          className="h-8 w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
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
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
                {soldOut && eventActive && canPurchase && (
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void handleJoinWaitlist(t.id)}
                    >
                      Join Waitlist
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Booking form footer */}
          {!canPurchase && user && (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Organizer accounts manage sales from{' '}
              <Link href="/organizer/bookings" className="font-bold text-primary underline">
                Bookings
              </Link>{' '}
              and{' '}
              <Link href="/organizer/tickets" className="font-bold text-primary underline">
                Tickets
              </Link>
              .
            </div>
          )}

          {canPurchase && eventActive && tickets.some((t) => t.status === 'available') && (
            <div className="mt-6 space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="promo" className="shrink-0">
                  Promo code
                </Label>
                <Input
                  id="promo"
                  placeholder="Optional"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="max-w-48"
                />
              </div>

              {subtotal > 0 && (
                <p className="text-muted-foreground text-sm">
                  Subtotal: <span className="font-semibold text-foreground">{formatVnd(subtotal)}</span>
                </p>
              )}

              <Button
                onClick={handleBook}
                disabled={!hasItems || booking}
                className="w-full sm:w-auto"
              >
                {booking
                  ? 'Creating booking…'
                  : user
                    ? 'Book tickets'
                    : 'Log in to book'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
