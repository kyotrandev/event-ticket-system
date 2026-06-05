import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class JoinWaitlistDto {
  @ApiProperty()
  @IsUUID()
  ticketTypeId: string;
}
