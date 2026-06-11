import { ApiProperty } from '@nestjs/swagger';

export class OrganizerStatsDto {
  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  liveNow: number;

  @ApiProperty({
    description:
      'Sum of PAID booking revenue across all organizer events (VND)',
  })
  totalRevenue: number;

  @ApiProperty()
  totalTicketsSold: number;

  @ApiProperty()
  draftCount: number;

  @ApiProperty()
  upcomingCount: number;
}
