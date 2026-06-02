import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EventStatusEnum } from '../event-status.enum';

export class UpdateEventStatusDto {
  @ApiProperty({ enum: EventStatusEnum })
  @IsEnum(EventStatusEnum)
  status: EventStatusEnum;
}
