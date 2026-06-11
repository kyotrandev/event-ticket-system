import { ApiProperty } from '@nestjs/swagger';
import { BookingStatusEnum } from '../booking-status.enum';

export class OrganizerBookingSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty({ enum: BookingStatusEnum })
  status: BookingStatusEnum;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  ticketCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  eventName: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  customerEmail: string;
}
