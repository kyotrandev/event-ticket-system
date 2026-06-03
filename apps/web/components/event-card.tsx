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
  return (
    <Link href={`/events/${event.id}`} className="group">
      <Card className="h-full overflow-hidden pt-0 transition-shadow group-hover:shadow-md">
        <div className="bg-muted aspect-video w-full overflow-hidden">
          {event.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.bannerUrl}
              alt={event.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
              No image
            </div>
          )}
        </div>
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="secondary">{event.category}</Badge>
            {event.status === 'ongoing' && <Badge>Live now</Badge>}
          </div>
          <CardTitle className="line-clamp-2">{event.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1.5 text-sm">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" />
            {formatDateTime(event.startTime)}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
