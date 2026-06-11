import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { QueryOrganizerTicketsDto } from '../../tickets/dto/query-organizer-tickets.dto';

export class QueryAdminTicketsDto extends QueryOrganizerTicketsDto {
  @ApiPropertyOptional({ description: 'Filter by organizer user id' })
  @IsString()
  @IsOptional()
  organizerId?: string;
}
