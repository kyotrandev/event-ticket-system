'use client';

import { useCallback, useState } from 'react';
import { useDeferredEffect } from '@/lib/use-deferred-effect';
import { ScrollText } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AuditLogEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(page, 30);
      setLogs(res.data);
      setHasNextPage(res.hasNextPage);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-2xl">
          <ScrollText className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground font-medium">
            Payment, booking, and system action trail.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground">No audit entries yet.</p>
      ) : (
        <div className="rounded-2xl border-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Time</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Entity</th>
                <th className="px-4 py-3 text-left font-semibold">Entity ID</th>
                <th className="px-4 py-3 text-left font-semibold">User</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3">{log.entity}</td>
                  <td className="px-4 py-3 font-mono text-xs max-w-[140px] truncate">
                    {log.entityId}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.userId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          className="rounded-2xl"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="flex items-center text-sm text-muted-foreground px-2">Page {page}</span>
        <Button
          variant="outline"
          className={cn('rounded-2xl', !hasNextPage && 'opacity-50')}
          disabled={!hasNextPage || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
