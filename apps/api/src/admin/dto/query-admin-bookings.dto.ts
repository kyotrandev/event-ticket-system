import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { QueryOrganizerBookingsDto } from '../../bookings/dto/query-organizer-bookings.dto';

export class QueryAdminBookingsDto extends QueryOrganizerBookingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Filter by organizer user id' })
  @IsString()
  @IsOptional()
  @Type(() => String)
  organizerId?: string;
}
