import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketTypeDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: Number, description: 'Price in VND (integer, >= 0)' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ type: Number, description: 'Total quantity (>= 1)' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  totalQty: number;

  @ApiProperty()
  @IsDateString()
  saleStart: string;

  @ApiProperty()
  @IsDateString()
  saleEnd: string;
}
