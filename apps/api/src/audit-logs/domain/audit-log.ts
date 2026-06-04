import { ApiProperty } from '@nestjs/swagger';

export class AuditLog {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: String, nullable: true })
  userId: string | null;

  @ApiProperty({ type: String, example: 'payment.succeeded' })
  action: string;

  @ApiProperty({ type: String, example: 'Booking' })
  entity: string;

  @ApiProperty({ type: String })
  entityId: string;

  @ApiProperty({ type: Object, nullable: true })
  payload: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
