import { ApiProperty } from '@nestjs/swagger';
import { PromoCodeDiscountTypeEnum } from '../promo-code-discount-type.enum';

export class PromoCode {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: String, example: 'SUMMER20' })
  code: string;

  @ApiProperty({ enum: PromoCodeDiscountTypeEnum })
  discountType: PromoCodeDiscountTypeEnum;

  @ApiProperty({ type: Number, description: 'PERCENT: 0-100; FIXED: VND' })
  discountValue: number;

  @ApiProperty({ type: Number })
  maxUses: number;

  @ApiProperty({ type: Number, default: 0 })
  usedCount: number;

  @ApiProperty()
  validFrom: Date;

  @ApiProperty()
  validTo: Date;

  @ApiProperty({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
