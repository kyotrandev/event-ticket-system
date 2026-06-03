'use client';

import { use, useEffect, useState } from 'react';
import { CalendarDays, MapPin, Tag } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
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
  const [event, setEvent] = useState<EventModel | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
        <p className="flex items-center gap-2">
          <MapPin className="size-4" />
          {event.location}
        </p>
      </div>

      {event.description && (
        <p className="mb-8 whitespace-pre-line leading-relaxed">
          {event.description}
        </p>
      )}

      <h2 className="mb-4 text-xl font-semibold">Tickets</h2>
      {tickets.length === 0 ? (
        <p className="text-muted-foreground">
          No ticket types are available yet.
        </p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const left = remaining(t);
            const soldOut = t.status === 'sold_out' || left === 0;
            const closed = t.status === 'closed';
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
                            : `${left} remaining`}
                      </CardDescription>
                    </div>
                    <div className="text-lg font-semibold">
                      {formatVnd(t.price)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Booking flow is delivered in Phase 3. */}
                  <Button disabled={soldOut || closed} title="Booking coming soon">
                    {soldOut ? 'Sold out' : closed ? 'Closed' : 'Book (soon)'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
