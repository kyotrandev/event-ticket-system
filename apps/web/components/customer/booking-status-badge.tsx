import type { BookingStatus } from '@/lib/types';
import {
  BOOKING_STATUS_LABELS,
  bookingStatusBadgeVariant,
} from '@/lib/booking-utils';
import { Badge } from '@/components/ui/badge';

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge
      variant={bookingStatusBadgeVariant(status)}
      className="rounded-full font-bold text-xs"
    >
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
