import { ApiProperty } from '@nestjs/swagger';

export class TicketTypeStatDto {
  @ApiProperty() ticketTypeId: string;
  @ApiProperty() name: string;
  @ApiProperty() sold: number;
  @ApiProperty() revenue: number;
}

export class DailyBookingStatDto {
  @ApiProperty() date: string;
  @ApiProperty() bookings: number;
  @ApiProperty() revenue: number;
}

export class TopPromoCodeDto {
  @ApiProperty() code: string;
  @ApiProperty() usageCount: number;
  @ApiProperty() totalDiscount: number;
}

export class EventAnalyticsDto {
  @ApiProperty({ type: [TicketTypeStatDto] })
  ticketTypeStats: TicketTypeStatDto[];

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty({ description: 'Percentage 0–100' })
  checkInRate: number;

  @ApiProperty({ type: [DailyBookingStatDto] })
  dailyBookings: DailyBookingStatDto[];

  @ApiProperty({ type: [TopPromoCodeDto] })
  topPromoCodes: TopPromoCodeDto[];
}
