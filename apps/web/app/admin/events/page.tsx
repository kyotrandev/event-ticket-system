'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminEventSummary, EventQuery } from '@/lib/types';
import { fmtDateTime, fmtVnd, parseLocation } from '@/lib/organizer-utils';
import { getEventStatusTag } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EventQuery['status']>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getEvents({
        page,
        limit: 12,
        keyword: search || undefined,
        status: status || undefined,
        sort: 'createdAt',
      });
      setEvents(res.data);
      setHasNextPage(res.hasNextPage);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-2xl">
          <CalendarDays className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">All Events</h1>
          <p className="text-muted-foreground font-medium">
            Every event on the platform with organizer and sales context.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search events…"
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
        <select
          className="flex h-11 rounded-2xl border-2 border-input bg-transparent px-3 text-sm font-bold max-w-[160px]"
          value={status ?? ''}
          onChange={(e) => {
            setStatus(e.target.value as EventQuery['status']);
            setPage(1);
          }}
        >
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="ongoing">Ongoing</option>
          <option value="ended">Ended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">No events found.</p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((event) => {
            const tag = getEventStatusTag(event);
            return (
              <Card key={event.id} className="border-2 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[16/7] bg-muted border-b">
                  {event.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.bannerUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted-foreground text-sm">
                      No banner
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`rounded-full font-bold ${tag.className}`}>{tag.label}</Badge>
                    <Badge variant="outline" className="rounded-full">{event.category}</Badge>
                  </div>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="font-extrabold text-lg hover:text-primary line-clamp-2 block"
                  >
                    {event.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {event.organizerName} · {event.organizerEmail}
                  </p>
                  <p className="text-sm text-muted-foreground">{fmtDateTime(event.startTime)}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {parseLocation(event.location)}
                  </p>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t">
                    <span>{event.ticketsSold}/{event.totalCapacity} sold</span>
                    <span>{fmtVnd(event.revenue)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
