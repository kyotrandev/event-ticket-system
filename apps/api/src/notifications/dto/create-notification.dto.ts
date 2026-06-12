import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relatedEntityId?: string;
}
