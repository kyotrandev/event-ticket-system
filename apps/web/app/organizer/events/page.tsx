'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Calendar, Grid3X3, List, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { organizerApi } from '@/lib/api';
import type { EventQuery, OrganizerEventSummary, OrganizerStats } from '@/lib/types';
import {
  buildAttentionAlerts,
  exportAttendeesCsv,
} from '@/lib/organizer-utils';
import { OrganizerKpiStrip } from '@/components/organizer/organizer-kpi-strip';
import { OrganizerEventCard } from '@/components/organizer/organizer-event-card';
import { OrganizerCalendar } from '@/components/organizer/organizer-calendar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

type ViewMode = 'grid' | 'list' | 'calendar';

export default function OrganizerEventsPage() {
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [events, setEvents] = useState<OrganizerEventSummary[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<OrganizerEventSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<EventQuery['status']>('');
  const [sort, setSort] = useState<EventQuery['sort']>('createdAt');
  const [view, setView] = useState<ViewMode>('grid');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [search, setSearch] = useState({
    keyword: '',
    status: '' as EventQuery['status'],
    sort: 'createdAt' as EventQuery['sort'],
  });

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizerEventSummary | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await organizerApi.getStats();
      setStats(s);
    } catch {
      // stats optional on error
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizerApi.getEvents({
        page,
        limit: view === 'calendar' ? 100 : PAGE_SIZE,
        keyword: search.keyword || undefined,
        status: search.status || undefined,
        sort: search.sort,
      });
      setEvents(res.data);
      setHasNextPage(res.hasNextPage);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page, search, view]);

  const loadCalendarEvents = useCallback(async () => {
    if (view !== 'calendar') return;
    try {
      const res = await organizerApi.getEvents({
        page: 1,
        limit: 100,
        sort: 'startTime',
      });
      setCalendarEvents(res.data);
    } catch {
      setCalendarEvents([]);
    }
  }, [view]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadCalendarEvents();
  }, [loadCalendarEvents]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch({ keyword, status, sort });
    }, 400);
    return () => clearTimeout(t);
  }, [keyword, status, sort]);

  const alerts = buildAttentionAlerts(events);

  async function handlePublish(id: string) {
    setPublishingId(id);
    try {
      await organizerApi.updateEventStatus(id, 'published');
      toast.success('Event published!');
      await Promise.all([loadEvents(), loadStats()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to publish event');
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const copy = await organizerApi.duplicateEvent(id);
      toast.success('Event duplicated');
      await loadEvents();
      window.location.href = `/organizer/events/${copy.id}/edit`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate event');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await organizerApi.deleteEvent(deleteTarget.id);
      toast.success('Event deleted');
      setDeleteTarget(null);
      await Promise.all([loadEvents(), loadStats()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete event');
    }
  }

  async function handleExport(eventId: string, eventName: string) {
    try {
      const attendees = await organizerApi.getAttendees(eventId);
      exportAttendeesCsv(attendees, eventName);
      toast.success('CSV exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to export CSV');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            My Events
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Manage events, track revenue, and coordinate your team in one place.
          </p>
        </div>
        <Link
          href="/organizer/events/create"
          className={buttonVariants({ size: 'lg', className: 'rounded-2xl font-bold shadow-sm' })}
        >
          <Plus className="size-5 mr-2" />
          Create Event
        </Link>
      </div>

      {stats && <OrganizerKpiStrip stats={stats} />}

      {alerts.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 space-y-2">
          <p className="font-extrabold text-sm flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-4" />
            Needs attention
          </p>
          <ul className="space-y-1.5">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="text-sm font-semibold hover:text-primary transition-colors"
                >
                  <span className="font-extrabold">{a.eventName}:</span> {a.message}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-3xl border-2 border-border bg-muted/30 p-4 md:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              placeholder="Search by event name…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-12 pl-12 rounded-2xl border-2 font-medium text-base"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EventQuery['status'])}
            className="h-12 rounded-2xl border-2 border-border bg-background px-4 font-bold text-sm"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Upcoming</option>
            <option value="ongoing">Live now</option>
            <option value="ended">Ended</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as EventQuery['sort'])}
            className="h-12 rounded-2xl border-2 border-border bg-background px-4 font-bold text-sm"
          >
            <option value="createdAt">Newest</option>
            <option value="startTime">Soonest</option>
            <option value="revenue">Highest revenue</option>
            <option value="sold">Best selling</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-2xl border-2 border-border p-1 bg-background">
            {(
              [
                { id: 'grid', icon: Grid3X3, label: 'Grid' },
                { id: 'list', icon: List, label: 'List' },
                { id: 'calendar', icon: Calendar, label: 'Calendar' },
              ] as const
            ).map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setView(v.id);
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors',
                    view === v.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground font-bold">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-3xl border-2 border-border bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 && !error ? (
        <div className="text-center py-16 px-6 rounded-3xl border-2 border-dashed border-border bg-muted/20">
          <Calendar className="size-12 mx-auto text-primary/40 mb-4" />
          <h2 className="text-xl font-extrabold mb-2">No events yet</h2>
          <p className="text-muted-foreground font-medium mb-6 max-w-md mx-auto">
            Create your first event — add ticket types, publish, and start selling
            in minutes.
          </p>
          <ol className="text-sm text-left max-w-xs mx-auto space-y-2 mb-8 font-semibold text-muted-foreground">
            <li>1. Create event + banner</li>
            <li>2. Add ticket types</li>
            <li>3. Publish & share link</li>
          </ol>
          <Link
            href="/organizer/events/create"
            className={buttonVariants({ size: 'lg', className: 'rounded-2xl font-bold' })}
          >
            <Plus className="size-5 mr-2" />
            Create your first event
          </Link>
        </div>
      ) : view === 'calendar' ? (
        <OrganizerCalendar
          events={calendarEvents}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((ev) => (
            <OrganizerEventCard
              key={ev.id}
              event={ev}
              publishingId={publishingId}
              onPublish={handlePublish}
              onDuplicate={handleDuplicate}
              onDelete={(id) => {
                const target = events.find((e) => e.id === id);
                if (target) setDeleteTarget(target);
              }}
              onExport={handleExport}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <OrganizerEventCard
              key={ev.id}
              event={ev}
              publishingId={publishingId}
              onPublish={handlePublish}
              onDuplicate={handleDuplicate}
              onDelete={(id) => {
                const target = events.find((e) => e.id === id);
                if (target) setDeleteTarget(target);
              }}
              onExport={handleExport}
            />
          ))}
        </div>
      )}

      {view !== 'calendar' && (page > 1 || hasNextPage) && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl font-bold"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm font-bold text-muted-foreground">
            Page {page}
          </span>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl font-bold"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? Only
              draft events can be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
