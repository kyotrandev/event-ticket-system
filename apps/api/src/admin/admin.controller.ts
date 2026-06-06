import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AnalyticsService } from '../analytics/analytics.service';
import { AdminStatsDto } from '../analytics/dto/admin-stats.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';

class PendingOrganizersQueryDto {
  page?: number;
  limit?: number;
}

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Admin')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOkResponse({ type: AdminStatsDto })
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  getStats(): Promise<AdminStatsDto> {
    return this.analyticsService.getAdminStats();
  }

  @ApiOkResponse({ type: InfinityPaginationResponse(User) })
  @SerializeOptions({ groups: ['admin'] })
  @Get('organizers/pending')
  @HttpCode(HttpStatus.OK)
  async getPendingOrganizers(
    @Query() query: PendingOrganizersQueryDto,
  ): Promise<InfinityPaginationResponseDto<User>> {
    const page = query.page ?? 1;
    let limit = query.limit ?? 10;
    if (limit > 50) limit = 50;

    return infinityPagination(
      await this.usersService.findPendingOrganizers({ page, limit }),
      { page, limit },
    );
  }
}
