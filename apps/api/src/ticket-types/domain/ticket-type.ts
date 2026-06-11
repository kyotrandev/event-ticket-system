import { ApiProperty } from '@nestjs/swagger';
import { TicketTypeStatusEnum } from '../ticket-type-status.enum';
import { Event } from '../../events/domain/event';

export class TicketType {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  eventId: string;

  @ApiProperty({ type: () => Event })
  event?: Event;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: Number })
  price: number;

  @ApiProperty({ type: Number })
  totalQty: number;

  @ApiProperty({ type: Number, default: 0 })
  soldQty: number;

  @ApiProperty({ type: Number, default: 0 })
  reservedQty: number;

  @ApiProperty()
  saleStart: Date;

  @ApiProperty()
  saleEnd: Date;

  @ApiProperty({ enum: TicketTypeStatusEnum })
  status: TicketTypeStatusEnum;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
