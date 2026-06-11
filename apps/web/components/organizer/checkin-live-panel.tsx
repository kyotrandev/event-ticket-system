'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ScanLine } from 'lucide-react';
import { checkInApi } from '@/lib/api';
import type { CheckInLogEntry } from '@/lib/types';
import { fmtDateTime } from '@/lib/organizer-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function CheckinLivePanel({
  eventId,
  checkInRate,
  ticketsSold,
}: {
  eventId: string;
  checkInRate: number;
  ticketsSold: number;
}) {
  const [logs, setLogs] = useState<CheckInLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await checkInApi.getLogs(eventId);
      setLogs(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load check-in logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, [eventId]);

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            Live check-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${Math.min(100, checkInRate)}%` }}
              />
            </div>
            <span className="text-sm font-extrabold w-14 text-right">
              {checkInRate}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {logs.length} check-ins · {ticketsSold} tickets sold
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl font-bold"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-3 text-sm font-medium">
          {error}
        </div>
      )}

      <Card className="rounded-3xl border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
          ) : (
            <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {logs.slice(0, 30).map((log, i) => (
                <li
                  key={`${log.ticketCode}-${log.scannedAt}-${i}`}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-muted/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate">{log.attendeeName}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {log.ticketTypeName} · {log.staffName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDateTime(log.scannedAt)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-full font-bold shrink-0 uppercase text-[10px]"
                  >
                    {log.method}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
