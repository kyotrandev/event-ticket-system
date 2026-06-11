import { ApiProperty } from '@nestjs/swagger';
import { Event } from '../domain/event';

export class OrganizerEventSummaryDto extends Event {
  @ApiProperty()
  ticketsSold: number;

  @ApiProperty()
  totalCapacity: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  checkInRate: number;

  @ApiProperty()
  ticketTypeCount: number;

  @ApiProperty()
  staffCount: number;
}
