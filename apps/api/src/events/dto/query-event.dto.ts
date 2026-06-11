import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEventDto {
  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 10 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ type: String, description: 'ISO date string' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ type: String, description: 'ISO date string' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'ongoing', 'ended', 'cancelled'] })
  @IsString()
  @IsOptional()
  status?: string;
}
