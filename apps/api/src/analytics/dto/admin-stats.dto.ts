import { ApiProperty } from '@nestjs/swagger';

export class UsersByRoleDto {
  @ApiProperty() admin: number;
  @ApiProperty() customer: number;
  @ApiProperty() organizer: number;
  @ApiProperty() staff: number;
  @ApiProperty() total: number;
}

export class EventsByStatusDto {
  @ApiProperty() draft: number;
  @ApiProperty() published: number;
  @ApiProperty() ongoing: number;
  @ApiProperty() ended: number;
  @ApiProperty() cancelled: number;
}

export class BookingsByStatusDto {
  @ApiProperty() pendingPayment: number;
  @ApiProperty() paid: number;
  @ApiProperty() expired: number;
  @ApiProperty() failed: number;
  @ApiProperty() refunded: number;
}

export class AdminStatsDto {
  @ApiProperty({ type: UsersByRoleDto })
  users: UsersByRoleDto;

  @ApiProperty({ type: EventsByStatusDto })
  events: EventsByStatusDto;

  @ApiProperty({ type: BookingsByStatusDto })
  bookings: BookingsByStatusDto;

  @ApiProperty({ description: 'Sum of all PAID bookings totalAmount (VND)' })
  totalGrossRevenue: number;

  @ApiProperty({
    description: 'Sum of all REFUNDED bookings totalAmount (VND)',
  })
  totalRefunds: number;
}
