import { ApiProperty } from '@nestjs/swagger';
import { TicketType } from '../../ticket-types/domain/ticket-type';

export class BookingItem {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: String })
  bookingId: string;

  @ApiProperty({ type: String })
  ticketTypeId: string;

  @ApiProperty({ type: () => TicketType })
  ticketType?: TicketType;

  @ApiProperty({ type: Number })
  quantity: number;

  @ApiProperty({ type: Number, description: 'price snapshot, integer VND' })
  unitPrice: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
