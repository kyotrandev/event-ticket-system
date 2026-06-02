import { ApiProperty } from '@nestjs/swagger';
import { EventStatusEnum } from '../event-status.enum';

export class Event {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  organizerId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String })
  location: string;

  @ApiProperty({ type: String })
  category: string;

  @ApiProperty({ type: [String], nullable: true })
  tags: string[] | null;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty({ type: String, nullable: true })
  bannerUrl: string | null;

  @ApiProperty({ type: Number, default: 24 })
  cancellationWindowHours: number;

  @ApiProperty({ type: Number, default: 6 })
  maxTicketsPerOrder: number;

  @ApiProperty({ enum: EventStatusEnum })
  status: EventStatusEnum;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;
}
