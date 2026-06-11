'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { OrganizerEventSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-muted-foreground',
  published: 'bg-primary',
  ongoing: 'bg-success animate-pulse',
  ended: 'bg-muted-foreground/50',
  cancelled: 'bg-destructive',
};

interface OrganizerCalendarProps {
  events: OrganizerEventSummary[];
  month: Date;
  onMonthChange: (d: Date) => void;
}

export function OrganizerCalendar({
  events,
  month,
  onMonthChange,
}: OrganizerCalendarProps) {
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const cells: Array<{ date: Date | null; events: OrganizerEventSummary[] }> = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, events: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIdx, d);
    const dayEvents = events.filter((ev) => {
      const start = new Date(ev.startTime);
      return (
        start.getFullYear() === year &&
        start.getMonth() === monthIdx &&
        start.getDate() === d
      );
    });
    cells.push({ date, events: dayEvents });
  }

  const monthLabel = month.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="rounded-3xl border-2 border-border bg-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-lg capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => onMonthChange(new Date(year, monthIdx - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => onMonthChange(new Date(year, monthIdx + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-bold text-muted-foreground py-2"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const isToday =
            cell.date &&
            cell.date.toDateString() === new Date().toDateString();
          return (
            <div
              key={idx}
              className={cn(
                'min-h-[88px] rounded-2xl border border-transparent p-1.5',
                cell.date && 'bg-muted/30 hover:bg-muted/50',
                isToday && 'ring-2 ring-primary border-primary/20',
              )}
            >
              {cell.date && (
                <>
                  <p
                    className={cn(
                      'text-xs font-bold mb-1',
                      isToday ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {cell.date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {cell.events.slice(0, 2).map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/organizer/events/${ev.id}`}
                        className="flex items-center gap-1 rounded-lg bg-background px-1.5 py-0.5 text-[10px] font-bold truncate hover:bg-primary/10"
                        title={ev.name}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full shrink-0',
                            STATUS_DOT[ev.status] ?? 'bg-muted-foreground',
                          )}
                        />
                        <span className="truncate">{ev.name}</span>
                      </Link>
                    ))}
                    {cell.events.length > 2 && (
                      <p className="text-[10px] text-muted-foreground font-bold px-1">
                        +{cell.events.length - 2} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          No events this month.
        </p>
      )}
    </div>
  );
}

export function listEventsForMonth(
  events: OrganizerEventSummary[],
  month: Date,
): OrganizerEventSummary[] {
  return events.filter((ev) => {
    const start = new Date(ev.startTime);
    return (
      start.getFullYear() === month.getFullYear() &&
      start.getMonth() === month.getMonth()
    );
  });
}
