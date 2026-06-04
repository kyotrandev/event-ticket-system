import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
