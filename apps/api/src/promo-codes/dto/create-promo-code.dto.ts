import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PromoCodeDiscountTypeEnum } from '../promo-code-discount-type.enum';

export class CreatePromoCodeDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: PromoCodeDiscountTypeEnum })
  @IsEnum(PromoCodeDiscountTypeEnum)
  discountType: PromoCodeDiscountTypeEnum;

  @ApiProperty({ example: 20, description: 'PERCENT: 0-100; FIXED: VND' })
  @IsInt()
  @Min(1)
  discountValue: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  maxUses: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  validFrom: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  validTo: Date;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
