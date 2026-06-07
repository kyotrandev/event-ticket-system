import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventModel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function EventCard({ event }: { event: EventModel }) {
  return (
    <Link href={`/events/${event.id}`} className="group block h-full">
      <Card className="h-full bg-card p-0 transition-transform hover:-translate-x-1 hover:-translate-y-1">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {event.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.bannerUrl}
              alt={event.name}
              className="size-full object-cover saturate-[1.15] transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm font-semibold text-muted-foreground">
              No image
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{event.category}</Badge>
            {event.status === 'ongoing' && <Badge>Live</Badge>}
          </div>
          <div className="absolute bottom-0 left-0 h-2 w-full bg-secondary" />
        </div>

        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <h2 className="line-clamp-2 text-2xl font-black leading-tight">
              {event.name}
            </h2>
            {event.description && (
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-muted-foreground">
                {event.description}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-2 text-sm font-semibold text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-primary" />
              <span className="line-clamp-1">{formatDateTime(event.startTime)}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-secondary" />
              <span className="line-clamp-1">{event.location}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
