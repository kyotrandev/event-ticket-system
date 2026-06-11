import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventModel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function getEventStatusTag(event: EventModel) {
  if (event.status === 'cancelled') {
    return { label: 'Cancelled', className: 'bg-danger text-danger-foreground hover:bg-danger/90' };
  }
  
  const now = new Date();
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  if (event.status === 'ongoing' || (start <= now && end >= now && event.status !== 'ended')) {
    return { label: 'Live now', className: 'bg-success text-success-foreground hover:bg-success/90 animate-pulse' };
  }
  
  if (end < now || event.status === 'ended') {
    return { label: 'Ended', className: 'bg-muted text-muted-foreground hover:bg-muted/90 border-2 border-border' };
  }

  if (start > now && (event.status === 'published' || event.status === 'draft')) {
    return { label: 'Upcoming', className: 'bg-primary text-primary-foreground hover:bg-primary/90' };
  }

  return { label: event.status, className: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 capitalize' };
}

export function EventCard({ event }: { event: EventModel }) {
  let displayLocation = event.location;
  try {
    const parsed = JSON.parse(event.location);
    if (parsed.address) {
      displayLocation = parsed.address;
    }
  } catch {
    // Ignore, keep raw string
  }

  return (
    <Link href={`/events/${event.id}`} className="group block">
      <Card className="h-full overflow-hidden pt-0 transition-transform duration-300 group-hover:-translate-y-2">
        <div className="bg-muted aspect-video w-full overflow-hidden border-b-2 border-border">
          {event.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.bannerUrl}
              alt={event.name}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="text-primary/60 font-bold flex size-full items-center justify-center text-sm bg-primary/10">
              No image
            </div>
          )}
        </div>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="rounded-full font-bold px-3">{event.category}</Badge>
            {(() => {
              const tag = getEventStatusTag(event);
              return <Badge className={`rounded-full font-bold px-3 ${tag.className}`}>{tag.label}</Badge>;
            })()}
          </div>
          <CardTitle className="line-clamp-2 mt-1">{event.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm font-medium">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-secondary" />
            {formatDateTime(event.startTime)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-danger" />
            <span className="line-clamp-1">{displayLocation}</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
