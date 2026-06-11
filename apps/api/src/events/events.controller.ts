import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  SerializeOptions,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { EventsService } from './events.service';
import { Event } from './domain/event';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { EventStaffAssignmentsService } from '../event-staff-assignments/event-staff-assignments.service';
import { AssignStaffDto } from '../event-staff-assignments/dto/assign-staff.dto';
import { EventStaffAssignment } from '../event-staff-assignments/domain/event-staff-assignment';
import { InviteStaffDto } from '../event-staff-assignments/dto/invite-staff.dto';
import { UpdateStaffDto } from '../event-staff-assignments/dto/update-staff.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import { EventAnalyticsDto } from '../analytics/dto/event-analytics.dto';

@ApiTags('Events')
@Controller({
  path: 'events',
  version: '1',
})
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly staffService: EventStaffAssignmentsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @ApiCreatedResponse({ type: Event })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @SerializeOptions({ groups: [] })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateEventDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<Event> {
    return this.eventsService.create(String(req.user.id), dto);
  }

  @ApiOkResponse({ type: InfinityPaginationResponse(Event) })
  @SerializeOptions({ groups: [] })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query() query: QueryEventDto,
  ): Promise<InfinityPaginationResponseDto<Event>> {
    return this.eventsService.findPublished(query);
  }

  @ApiOkResponse({ type: InfinityPaginationResponse(Event) })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @SerializeOptions({ groups: [] })
  @Get('my')
  @HttpCode(HttpStatus.OK)
  findMine(
    @Query() query: QueryEventDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<InfinityPaginationResponseDto<Event>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.eventsService.findByOrganizer(String(req.user.id), page, limit);
  }

  @ApiOkResponse({ type: [Object] })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.staff)
  @Get('staff/assignments')
  @HttpCode(HttpStatus.OK)
  getStaffAssignments(
    @Request() req: { user: JwtPayloadType },
  ): Promise<any[]> {
    return this.staffService.listByStaff(String(req.user.id));
  }

  @ApiOkResponse({ type: Event })
  @SerializeOptions({ groups: [] })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  findOne(@Param('id') id: string): Promise<NullableType<Event>> {
    return this.eventsService.findById(id);
  }

  @ApiOkResponse({ type: Event })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @SerializeOptions({ groups: [] })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<Event> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.eventsService.update(id, String(req.user.id), dto, isAdmin);
  }

  @ApiOkResponse({ type: Event })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @SerializeOptions({ groups: [] })
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<Event> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.eventsService.updateStatus(
      id,
      String(req.user.id),
      dto,
      isAdmin,
    );
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String, required: true })
  remove(
    @Param('id') id: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<void> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.eventsService.remove(id, String(req.user.id), isAdmin);
  }

  @ApiOkResponse({ type: EventAnalyticsDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Get(':id/analytics')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<EventAnalyticsDto> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.analyticsService.getEventAnalytics(
      id,
      String(req.user.id),
      isAdmin,
    );
  }

  // --- Staff management ---

  @ApiCreatedResponse({ type: EventStaffAssignment })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Post(':id/staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'id', type: String, required: true })
  assignStaff(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() dto: AssignStaffDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<EventStaffAssignment> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.staffService.assign(
      eventId,
      dto.staffId,
      String(req.user.id),
      isAdmin,
    );
  }

  @ApiCreatedResponse({ type: EventStaffAssignment })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Post(':id/staff/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'id', type: String, required: true })
  inviteStaff(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() dto: InviteStaffDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<EventStaffAssignment> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.staffService.inviteStaff(
      eventId,
      dto.email,
      dto.firstName,
      dto.lastName,
      String(req.user.id),
      isAdmin,
    );
  }

  @ApiOkResponse({ type: [EventStaffAssignment] })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Get(':id/staff')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  listStaff(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<object[]> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.staffService.listByEvent(eventId, String(req.user.id), isAdmin);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Delete(':id/staff/:staffId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiParam({ name: 'staffId', type: String, required: true })
  removeStaff(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Param('staffId') staffId: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<void> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.staffService.remove(
      eventId,
      staffId,
      String(req.user.id),
      isAdmin,
    );
  }

  @ApiOkResponse({ type: EventStaffAssignment })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Patch(':id/staff/:staffId')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiParam({ name: 'staffId', type: String, required: true })
  updateStaff(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Param('staffId') staffId: string,
    @Body() dto: UpdateStaffDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<any> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.staffService.updateStaff(
      eventId,
      staffId,
      dto.firstName,
      dto.lastName,
      String(req.user.id),
      isAdmin,
    );
  }
}
