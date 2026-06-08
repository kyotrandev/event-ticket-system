import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsUrl,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({ type: Number, default: 24 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  cancellationWindowHours?: number;

  @ApiPropertyOptional({ type: Number, default: 6 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  @Type(() => Number)
  maxTicketsPerOrder?: number;
}
