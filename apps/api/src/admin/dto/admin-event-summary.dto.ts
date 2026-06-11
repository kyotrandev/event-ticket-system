import { ApiProperty } from '@nestjs/swagger';
import { OrganizerEventSummaryDto } from '../../events/dto/organizer-event-summary.dto';

export class AdminEventSummaryDto extends OrganizerEventSummaryDto {
  @ApiProperty()
  organizerName: string;

  @ApiProperty()
  organizerEmail: string;
}
