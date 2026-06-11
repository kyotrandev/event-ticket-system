import { ApiProperty } from '@nestjs/swagger';
import { OrganizerBookingSummaryDto } from './organizer-booking-summary.dto';

export class AdminBookingSummaryDto extends OrganizerBookingSummaryDto {
  @ApiProperty()
  organizerName: string;

  @ApiProperty()
  organizerEmail: string;
}
