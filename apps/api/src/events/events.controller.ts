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

@ApiTags('Events')
@Controller({
  path: 'events',
  version: '1',
})
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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
}
