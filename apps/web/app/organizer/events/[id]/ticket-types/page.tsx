'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ticketTypeApi, organizerApi } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';
import { EventHubNav } from '@/components/organizer/event-hub-nav';
import type { TicketType, EventModel } from '@/lib/types';

export default function TicketTypesPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [event, setEvent] = useState<EventModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      Promise.all([
        organizerApi.getEvent(eventId),
        ticketTypeApi.list(eventId)
      ])
        .then(([ev, tt]) => {
          setEvent(ev);
          setTicketTypes(tt);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        })
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this ticket type?')) return;
    try {
      await ticketTypeApi.delete(id);
      setTicketTypes(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <Link href="/organizer/events" className="text-sm font-bold text-muted-foreground hover:text-primary">
            &larr; My Events
          </Link>
          <h1 className="text-2xl font-extrabold mt-2">Ticket types — {event?.name}</h1>
        </div>
        <Link href={`/organizer/events/${eventId}/ticket-types/create`} className={buttonVariants()}>
          + Add ticket type
        </Link>
      </div>
      {eventId && <EventHubNav eventId={eventId} />}

      {error && <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>}

      {ticketTypes.length === 0 && !error && (
        <p className="text-muted-foreground">No ticket types found.</p>
      )}

      {ticketTypes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Price (VND)</th>
                <th className="px-3 py-2 text-left">Quantity</th>
                <th className="px-3 py-2 text-left">Sales Window</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ticketTypes.map((tt) => (
                <tr key={tt.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{tt.name}</td>
                  <td className="px-3 py-2">{tt.price.toLocaleString()}</td>
                  <td className="px-3 py-2">{tt.soldQty} / {tt.totalQty}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(tt.saleStart).toLocaleDateString()} - {new Date(tt.saleEnd).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/organizer/events/${eventId}/ticket-types/${tt.id}/edit`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => void handleDelete(tt.id)}
                        className={buttonVariants({ variant: 'destructive', size: 'sm' })}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
