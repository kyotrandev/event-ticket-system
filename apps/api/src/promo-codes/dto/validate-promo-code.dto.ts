import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ValidatePromoCodeDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 500000, description: 'subtotal, integer VND' })
  @IsInt()
  @Min(0)
  amount: number;
}

export class ValidatePromoCodeResponseDto {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: 100000, description: 'integer VND' })
  discountAmount: number;
}
