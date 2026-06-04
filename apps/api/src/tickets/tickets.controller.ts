import {
  Controller,
  Get,
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
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

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
}
