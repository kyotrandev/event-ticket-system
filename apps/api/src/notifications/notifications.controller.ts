import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Notification } from './domain/notification';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllNotificationsDto } from './dto/find-all-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'notifications',
  version: '1',
})
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Notification),
  })
  async findAll(
    @Request() req,
    @Query() query: FindAllNotificationsDto,
  ): Promise<InfinityPaginationResponseDto<Notification>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.notificationsService.findByUser(String(req.user.id), {
        page,
        limit,
      }),
      { page, limit },
    );
  }

  @Patch(':id/read')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Notification,
  })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
