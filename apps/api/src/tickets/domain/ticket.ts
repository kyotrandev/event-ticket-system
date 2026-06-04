import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { TicketStatusEnum } from '../ticket-status.enum';
import { BookingItem } from '../../booking-items/domain/booking-item';

export class Ticket {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: String })
  bookingItemId: string;

  @ApiProperty({ type: () => BookingItem })
  bookingItem?: BookingItem;

  @ApiProperty({ type: String })
  eventId: string;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty({
    type: String,
    example: 'a2f6f4f0-7a31-4f7b-9a9a-1c2b3d4e5f60',
  })
  code: string;

  // Never serialize the HMAC secret; it only travels inside the QR image.
  @Exclude({ toPlainOnly: true })
  qrSecret: string;

  @ApiProperty({ enum: TicketStatusEnum })
  status: TicketStatusEnum;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
