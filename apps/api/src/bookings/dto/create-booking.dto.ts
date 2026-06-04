import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBookingItemDto {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  ticketTypeId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}

export class CreateBookingDto {
  @ApiProperty({ type: [CreateBookingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBookingItemDto)
  items: CreateBookingItemDto[];

  @ApiPropertyOptional({ example: 'SUMMER20' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  promoCode?: string;
}
