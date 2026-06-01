import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';
import { RoleEnum } from '../../roles/roles.enum';

export class AuthRegisterLoginDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  @Matches(/(?=.*[A-Z])/, { message: 'password must contain at least 1 uppercase letter' })
  @Matches(/(?=.*[0-9])/, { message: 'password must contain at least 1 number' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({
    enum: [RoleEnum.customer, RoleEnum.organizer],
    default: RoleEnum.customer,
    description: 'customer (default) or organizer (requires admin approval)',
  })
  @IsOptional()
  @IsEnum([RoleEnum.customer, RoleEnum.organizer], {
    message: 'role must be customer or organizer',
  })
  role?: RoleEnum.customer | RoleEnum.organizer;
}
