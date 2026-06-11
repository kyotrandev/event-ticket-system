import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Response,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response as ExpressResponse } from 'express';
import { TicketsService } from './tickets.service';
import { Ticket } from './domain/ticket';
import { CheckInResultDto } from '../check-in/dto/check-in-result.dto';
import { TicketMapper } from './infrastructure/persistence/relational/mappers/ticket.mapper';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { RoleEnum } from '../roles/roles.enum';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'tickets',
  version: '1',
})
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ groups: [] })
  @ApiOkResponse({ type: [Ticket] })
  findMine(@Request() req: { user: JwtPayloadType }): Promise<Ticket[]> {
    return this.ticketsService.findMine(String(req.user.id));
  }

  @Get(':code/qr')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'code', type: String, required: true })
  @ApiProduces('image/png')
  async getQr(
    @Param('code') code: string,
    @Request() req: { user: JwtPayloadType },
    @Response() res: ExpressResponse,
  ): Promise<void> {
    const png = await this.ticketsService.getQrPng(code, {
      id: String(req.user.id),
      roleId: req.user.role?.id ? Number(req.user.role.id) : undefined,
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  }

  @Get('events/:eventId/attendees')
  @HttpCode(HttpStatus.OK)
  async getAttendees(
    @Param('eventId') eventId: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<any[]> {
    // Basic verification - assume staff/organizer roles are guarded or checked
    return this.ticketsService.findEventAttendees(eventId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: Ticket })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
    @Request() req: { user: JwtPayloadType },
  ): Promise<Ticket> {
    const updated = await this.ticketsService.updateTicketStatus(id, dto.status as any);
    return TicketMapper.toDomain(updated);
  }

  @Get(':id/details')
  @HttpCode(HttpStatus.OK)
  async getDetails(
    @Param('id') id: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<any> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.ticketsService.getTicketDetails(id, String(req.user.id), isAdmin);
  }
}
