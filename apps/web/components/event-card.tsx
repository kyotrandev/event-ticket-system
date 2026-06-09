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
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full font-bold px-3">{event.category}</Badge>
            {event.status === 'ongoing' && <Badge className="rounded-full font-bold px-3 bg-success text-success-foreground hover:bg-success/90">Live now</Badge>}
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
