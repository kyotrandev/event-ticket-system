import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TicketStatusEnum } from '../ticket-status.enum';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatusEnum })
  @IsEnum(TicketStatusEnum)
  status: TicketStatusEnum;
}
