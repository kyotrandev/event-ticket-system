import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class notificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
