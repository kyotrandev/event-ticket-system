'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { checkInApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import type { CheckInLogEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

export default function CheckInLogsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<CheckInLogEntry[]>([]);
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
    if (!eventId) return;
    checkInApi
      .getLogs(eventId)
      .then(setLogs)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed to load logs'),
      )
      .finally(() => setLoading(false));
  }, [eventId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Check-In Logs</h1>
          <Link
            href={`/checkin/${eventId}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Back to Scanner
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
            {error}
          </div>
        )}

        {!error && logs.length === 0 && (
          <p className="text-muted-foreground text-sm">No check-ins yet.</p>
        )}

        {logs.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Attendee</th>
                  <th className="px-3 py-2 text-left">Ticket Type</th>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-left">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{log.ticketCode}</td>
                    <td className="px-3 py-2">{log.attendeeName}</td>
                    <td className="px-3 py-2">{log.ticketTypeName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(log.scannedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={log.method === 'qr' ? 'default' : 'secondary'}>
                        {log.method.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{log.staffName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {logs.length} check-in{logs.length !== 1 ? 's' : ''} total
        </p>
      </div>
    </div>
  );
}
