'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { waitlistApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { WaitlistEntry } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  notified: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-500',
};

export default function MyWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    waitlistApi.listMine()
      .then(res => setEntries(res))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load waitlist'))
      .finally(() => setLoading(false));
  }, []);

  async function handleLeave(id: string) {
    if (!confirm('Are you sure you want to leave this waitlist?')) return;
    try {
      await waitlistApi.leave(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave waitlist');
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">My Waitlist</h1>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>}

      {entries.length === 0 && !error && (
        <p className="text-muted-foreground">You are not on any waitlists.</p>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-left">Joined At</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Notified At</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/events/${entry.eventId}`} className="hover:underline">
                      View Event
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[entry.status] || 'bg-gray-100'}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.notifiedAt ? new Date(entry.notifiedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {(entry.status === 'waiting' || entry.status === 'notified') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleLeave(entry.id)}
                      >
                        Leave
                      </Button>
                    )}
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
