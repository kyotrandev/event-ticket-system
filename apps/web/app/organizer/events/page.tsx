'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { organizerApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import type { EventModel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-800',
  ongoing: 'bg-blue-100 text-blue-800',
  ended: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrganizerEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      const role = user.role?.id;
      if (role !== RoleId.Organizer && role !== RoleId.Admin) {
        router.replace('/');
      }
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && user) {
      organizerApi
        .getEvents(1, 50)
        .then((res) => setEvents(res.data))
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load events'))
        .finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Link href="/organizer/events/create" className={buttonVariants()}>
          + Create Event
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
      )}

      {events.length === 0 && !error && (
        <p className="text-muted-foreground">No events yet.</p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{ev.name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {new Date(ev.startTime).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {ev.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/organizer/events/${ev.id}/ticket-types`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Manage Tickets
                    </Link>
                    <Link
                      href={`/organizer/events/${ev.id}/analytics`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Analytics
                    </Link>
                    <Link
                      href={`/organizer/events/${ev.id}/staff`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Manage Staff
                    </Link>
                    <Link
                      href={`/organizer/events/${ev.id}/edit`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this event?')) {
                          organizerApi.deleteEvent(ev.id).then(() => {
                            setEvents(events.filter(e => e.id !== ev.id));
                          }).catch(err => {
                            setError(err instanceof Error ? err.message : 'Failed to delete');
                          });
                        }
                      }}
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

      <p className="text-xs text-muted-foreground">{events.length} event{events.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
