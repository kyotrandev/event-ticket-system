import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';

export class Notification {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({
    type: () => User,
  })
  user?: User;

  @ApiProperty({
    type: String,
  })
  title: string;

  @ApiProperty({
    type: String,
  })
  content: string;

  @ApiProperty({
    type: String,
  })
  type: string;

  @ApiProperty({
    type: Boolean,
  })
  isRead: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  relatedEntityId?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
