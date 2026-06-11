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
import { BookingsService } from '../bookings/bookings.service';
import { TicketsService } from '../tickets/tickets.service';
import { AdminBookingSummaryDto } from '../bookings/dto/admin-booking-summary.dto';
import { AdminTicketSummaryDto } from '../tickets/dto/admin-ticket-summary.dto';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { QueryAdminTicketsDto } from './dto/query-admin-tickets.dto';
import { QueryAdminEventsDto } from './dto/query-admin-events.dto';
import { AdminEventSummaryDto } from './dto/admin-event-summary.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditLog } from '../audit-logs/domain/audit-log';

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
    private readonly bookingsService: BookingsService,
    private readonly ticketsService: TicketsService,
    private readonly auditLogsService: AuditLogsService,
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

  @ApiOkResponse({ type: InfinityPaginationResponse(AdminBookingSummaryDto) })
  @Get('bookings')
  @HttpCode(HttpStatus.OK)
  getBookings(
    @Query() query: QueryAdminBookingsDto,
  ): Promise<InfinityPaginationResponseDto<AdminBookingSummaryDto>> {
    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 50);
    return this.bookingsService.findAllForAdmin(page, limit, {
      eventId: query.eventId,
      status: query.status,
      keyword: query.keyword,
      organizerId: query.organizerId,
    });
  }

  @ApiOkResponse({ type: InfinityPaginationResponse(AdminTicketSummaryDto) })
  @Get('tickets')
  @HttpCode(HttpStatus.OK)
  getTickets(
    @Query() query: QueryAdminTicketsDto,
  ): Promise<InfinityPaginationResponseDto<AdminTicketSummaryDto>> {
    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 50);
    return this.ticketsService.findAllForAdmin(page, limit, {
      eventId: query.eventId,
      status: query.status,
      keyword: query.keyword,
      organizerId: query.organizerId,
    });
  }

  @ApiOkResponse({ type: InfinityPaginationResponse(AdminEventSummaryDto) })
  @Get('events')
  @HttpCode(HttpStatus.OK)
  getEvents(
    @Query() query: QueryAdminEventsDto,
  ): Promise<InfinityPaginationResponseDto<AdminEventSummaryDto>> {
    return this.analyticsService.getAllEvents(query);
  }

  @ApiOkResponse({ type: InfinityPaginationResponse(AuditLog) })
  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  async getAuditLogs(
    @Query() query: PendingOrganizersQueryDto,
  ): Promise<InfinityPaginationResponseDto<AuditLog>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 30, 100);
    const result = await this.auditLogsService.findPaginated(page, limit);
    return { data: result.data, hasNextPage: result.hasNextPage };
  }
}
