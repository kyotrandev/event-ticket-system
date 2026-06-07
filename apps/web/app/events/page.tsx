'use client';

import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import type { EventModel, Paginated } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 12;

export default function EventsPage() {
  const [events, setEvents] = useState<EventModel[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState({ keyword: '', category: '' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await api.get<Paginated<EventModel>>(
          '/events',
          {
            page,
            limit: PAGE_SIZE,
            keyword: search.keyword || undefined,
            category: search.category || undefined,
          },
          false,
        );
        if (cancelled) return;
        setError(null);
        setEvents(res.data);
        setHasNextPage(res.hasNextPage);
      } catch {
        if (!cancelled) setError('Could not load events. Is the API running?');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch({ keyword, category });
  }

  return (
    <div className="page-shell space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <p className="vibrant-chip inline-flex">Browse events</p>
          <h1 className="display-play max-w-3xl text-6xl leading-[0.9] sm:text-7xl">
            Choose the loudest night on your calendar.
          </h1>
          <p className="max-w-2xl text-base font-semibold leading-7 text-muted-foreground">
            Search across published events, compare categories, and jump into
            the ticket picker with live availability.
          </p>
        </div>

        <form onSubmit={onSearch} className="vibrant-card space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm font-black">
            <SlidersHorizontal className="size-4 text-primary" />
            Filters
          </div>
          <Input
            aria-label="Search events"
            placeholder="Search name or description"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Input
            aria-label="Category"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Button type="submit" className="w-full">
            <Search className="size-4" />
            Search
          </Button>
        </form>
      </section>

      {loading ? (
        <div className="vibrant-card p-6 font-semibold text-muted-foreground">
          Loading events...
        </div>
      ) : error ? (
        <div className="vibrant-card border-destructive p-6 font-semibold text-destructive">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="vibrant-card p-8 text-center">
          <h2 className="text-2xl font-black">No events found</h2>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            Try a broader keyword or clear the category filter.
          </p>
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {!loading && !error && (page > 1 || hasNextPage) && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="vibrant-chip">Page {page}</span>
          <Button
            variant="outline"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
