'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, TicketCheck } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminTicketSummary, TicketStatus } from '@/lib/types';
import { OrganizerTicketsTable } from '@/components/organizer/organizer-tickets-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'issued', label: 'Issued' },
  { value: 'used', label: 'Used' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [status, setStatus] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTickets({
        page,
        limit: 20,
        status: status === 'all' ? undefined : (status as TicketStatus),
        keyword: search.trim() || undefined,
      });
      setTickets(res.data);
      setHasNextPage(res.hasNextPage);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-2xl">
          <TicketCheck className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">All Tickets</h1>
          <p className="text-muted-foreground font-medium">
            Every issued ticket across the platform.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search code, event, customer…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(keyword);
                setPage(1);
              }
            }}
            className="pl-9 rounded-2xl border-2 h-11"
          />
        </div>
        <Button
          variant="outline"
          className="rounded-2xl h-11"
          onClick={() => {
            setSearch(keyword);
            setPage(1);
          }}
        >
          Search
        </Button>
        <Select value={status} onValueChange={(v) => { setStatus(v ?? 'all'); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48 rounded-2xl border-2 h-11 font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading tickets…</p>
      ) : (
        <OrganizerTicketsTable
          tickets={tickets}
          showOrganizer
          detailBase="/admin/tickets"
        />
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
