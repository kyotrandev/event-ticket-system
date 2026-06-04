import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatusEnum } from '../payment-status.enum';

export class Payment {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: String })
  bookingId: string;

  @ApiProperty({ type: String })
  stripePaymentIntentId: string;

  @ApiProperty({ type: Number, description: 'integer VND' })
  amount: number;

  @ApiProperty({ type: String, default: 'vnd' })
  currency: string;

  @ApiProperty({ enum: PaymentStatusEnum })
  status: PaymentStatusEnum;

  @ApiProperty({ type: String, nullable: true })
  stripeRefundId: string | null;

  @ApiProperty({ nullable: true })
  refundedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
