import { ApiProperty } from '@nestjs/swagger';
import { TicketStatusEnum } from '../ticket-status.enum';

export class OrganizerTicketSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ enum: TicketStatusEnum })
  status: TicketStatusEnum;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  eventName: string;

  @ApiProperty({ nullable: true })
  ticketTypeName: string | null;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  customerEmail: string;

  @ApiProperty({ nullable: true })
  bookingId: string | null;
}
