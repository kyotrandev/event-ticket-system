'use client';

import Link from 'next/link';
import { CalendarDays, MapPin, Ticket, Users, Wallet } from 'lucide-react';
import type { OrganizerEventSummary } from '@/lib/types';
import { fmtDateTime, fmtVnd, parseLocation } from '@/lib/organizer-utils';
import { getEventStatusTag } from '@/components/event-card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EventActionsMenu } from './event-actions-menu';

interface OrganizerEventCardProps {
  event: OrganizerEventSummary;
  onPublish: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, name: string) => void;
  publishingId?: string | null;
}

export function OrganizerEventCard({
  event,
  onPublish,
  onDuplicate,
  onDelete,
  onExport,
  publishingId,
}: OrganizerEventCardProps) {
  const statusTag = getEventStatusTag(event);
  const soldPct =
    event.totalCapacity > 0
      ? Math.round((event.ticketsSold / event.totalCapacity) * 100)
      : 0;

  return (
    <Card className="overflow-visible border-2 border-border rounded-3xl pt-0 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:z-20 transition-all duration-300 relative">
      <div className="relative aspect-[16/7] bg-muted overflow-hidden border-b-2 border-border">
        {event.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.bannerUrl}
            alt={event.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-primary/5 text-primary/50 font-bold text-sm">
            No banner
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full font-bold">
            {event.category}
          </Badge>
          <Badge className={`rounded-full font-bold ${statusTag.className}`}>
            {statusTag.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        <div>
          <Link
            href={`/organizer/events/${event.id}`}
            className="text-lg font-extrabold leading-snug hover:text-primary transition-colors line-clamp-2"
          >
            {event.name}
          </Link>
          <div className="mt-2 space-y-1.5 text-sm text-muted-foreground font-medium">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-primary" />
              {fmtDateTime(event.startTime)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-destructive" />
              <span className="line-clamp-1">{parseLocation(event.location)}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="text-xs font-bold text-muted-foreground uppercase">Tickets sold</p>
            <p className="font-extrabold mt-0.5 flex items-center gap-1">
              <Ticket className="size-3.5" />
              {event.ticketsSold}
              {event.totalCapacity > 0 && (
                <span className="text-muted-foreground font-semibold">
                  / {event.totalCapacity}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="text-xs font-bold text-muted-foreground uppercase">Revenue</p>
            <p className="font-extrabold mt-0.5 flex items-center gap-1">
              <Wallet className="size-3.5" />
              {fmtVnd(event.revenue)}
            </p>
          </div>
        </div>

        {event.totalCapacity > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>Sales progress</span>
              <span>{soldPct}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, soldPct)}%` }}
              />
            </div>
          </div>
        )}

        {(event.status === 'ongoing' || event.status === 'ended') && event.ticketsSold > 0 && (
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              Check-in {event.checkInRate}%
            </span>
            <span>{event.staffCount} staff</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/organizer/events/${event.id}`}
            className={buttonVariants({ size: 'sm', className: 'rounded-xl font-bold flex-1 text-center' })}
          >
            Manage
          </Link>
          <EventActionsMenu
            event={event}
            publishing={publishingId === event.id}
            onPublish={
              event.status === 'draft'
                ? () => onPublish(event.id)
                : undefined
            }
            onDuplicate={() => onDuplicate(event.id)}
            onDelete={() => onDelete(event.id)}
            onExport={
              event.ticketsSold > 0
                ? () => onExport(event.id, event.name)
                : undefined
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
