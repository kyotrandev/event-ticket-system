import { ApiProperty } from '@nestjs/swagger';
import { OrganizerTicketSummaryDto } from './organizer-ticket-summary.dto';

export class AdminTicketSummaryDto extends OrganizerTicketSummaryDto {
  @ApiProperty()
  organizerName: string;

  @ApiProperty()
  organizerEmail: string;
}
