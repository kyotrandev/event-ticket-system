import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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
import { TicketTypesService } from './ticket-types.service';
import { TicketType } from './domain/ticket-type';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { NullableType } from '../utils/types/nullable.type';

@ApiTags('TicketTypes')
@Controller({ version: '1' })
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @ApiCreatedResponse({ type: TicketType })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @SerializeOptions({ strategy: 'excludeAll' })
  @Post('events/:eventId/ticket-types')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'eventId', type: String, required: true })
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateTicketTypeDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<TicketType> {
    return this.ticketTypesService.create(eventId, String(req.user.id), dto);
  }

  @ApiOkResponse({ type: [TicketType] })
  @SerializeOptions({ strategy: 'excludeAll' })
  @Get('events/:eventId/ticket-types')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'eventId', type: String, required: true })
  findByEvent(@Param('eventId') eventId: string): Promise<TicketType[]> {
    return this.ticketTypesService.findByEvent(eventId);
  }

  @ApiOkResponse({ type: TicketType })
  @SerializeOptions({ strategy: 'excludeAll' })
  @Get('ticket-types/:id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  findOne(@Param('id') id: string): Promise<NullableType<TicketType>> {
    return this.ticketTypesService.findById(id);
  }

  @ApiOkResponse({ type: TicketType })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @SerializeOptions({ strategy: 'excludeAll' })
  @Patch('ticket-types/:id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String, required: true })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketTypeDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<TicketType> {
    // eventId will be resolved from the ticketType itself in the service
    return this.ticketTypesService.update(id, '', String(req.user.id), dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Delete('ticket-types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String, required: true })
  remove(
    @Param('id') id: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<void> {
    return this.ticketTypesService.remove(id, '', String(req.user.id));
  }
}
