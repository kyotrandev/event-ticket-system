import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { QueryEventDto } from '../../events/dto/query-event.dto';

export class QueryAdminEventsDto extends QueryEventDto {
  @ApiPropertyOptional({ description: 'Filter by organizer user id' })
  @IsString()
  @IsOptional()
  organizerId?: string;
}
