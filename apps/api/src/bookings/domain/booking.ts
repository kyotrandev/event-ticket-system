import { ApiProperty } from '@nestjs/swagger';
import { BookingStatusEnum } from '../booking-status.enum';
import { BookingItem } from '../../booking-items/domain/booking-item';

export class Booking {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: String })
  customerId: string;

  @ApiProperty({ enum: BookingStatusEnum })
  status: BookingStatusEnum;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ type: String, nullable: true })
  promoCodeId: string | null;

  @ApiProperty({ type: Number, description: 'integer VND' })
  subtotalAmount: number;

  @ApiProperty({ type: Number, description: 'integer VND' })
  discountAmount: number;

  @ApiProperty({ type: Number, description: 'integer VND' })
  totalAmount: number;

  @ApiProperty({ type: () => [BookingItem] })
  items?: BookingItem[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
