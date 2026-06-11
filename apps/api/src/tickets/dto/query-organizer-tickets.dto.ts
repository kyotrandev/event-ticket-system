import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TicketStatusEnum } from '../ticket-status.enum';

export class QueryOrganizerTicketsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ enum: TicketStatusEnum })
  @IsEnum(TicketStatusEnum)
  @IsOptional()
  status?: TicketStatusEnum;

  @ApiPropertyOptional({
    description: 'Search by customer name, email, or ticket code',
  })
  @IsString()
  @IsOptional()
  keyword?: string;
}
