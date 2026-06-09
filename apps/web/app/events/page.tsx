'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
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

  // Committed filters that actually drive the query (form state is separate).
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState({ keyword: '', category: '' });

  // Refetch whenever page or committed filters change. State updates live in
  // the async closure, off the effect body.
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

  // Auto-search (debounced) when typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      setSearch({ keyword, category });
    }, 500);
    return () => clearTimeout(handler);
  }, [keyword, category]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch({ keyword, category });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          Browse Events
        </h1>
        <p className="text-muted-foreground text-lg font-medium">
          Find exactly what you&apos;re looking for, fast!
        </p>
      </div>

      <form
        onSubmit={onSearch}
        className="mb-12 flex flex-col gap-4 sm:flex-row p-6 bg-muted/50 rounded-3xl"
      >
        <Input
          placeholder="Search by name or description…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="h-14 text-lg rounded-2xl border-2 border-border focus-visible:ring-primary focus-visible:border-primary shadow-sm"
        />
        <Input
          placeholder="Category"
          className="sm:max-w-[200px] h-14 text-lg rounded-2xl border-2 border-border focus-visible:ring-primary focus-visible:border-primary shadow-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Button type="submit" size="lg" className="h-14 text-lg rounded-2xl px-8 shadow-sm">
          <Search className="size-5 mr-2" />
          Search
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full border-4 border-primary border-t-transparent size-12"></div>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-danger/10 text-danger font-bold text-lg text-center border-2 border-danger/20">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-2xl font-bold text-foreground mb-2">Oops! No results found.</p>
          <p className="text-muted-foreground font-medium text-lg">Try adjusting your search to find more magic.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <div key={event.id} className="animate-in zoom-in-95 duration-500 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
              <EventCard event={event} />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (page > 1 || hasNextPage) && (
        <div className="mt-16 flex items-center justify-center gap-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="w-32 rounded-full"
          >
            Previous
          </Button>
          <span className="font-bold text-lg text-muted-foreground">
            Page {page}
          </span>
          <Button
            variant="outline"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="w-32 rounded-full"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
