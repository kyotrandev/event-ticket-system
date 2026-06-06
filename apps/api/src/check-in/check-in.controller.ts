import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { CheckInService } from './check-in.service';
import { ScanTicketDto } from './dto/scan-ticket.dto';
import { ManualCheckInDto } from './dto/manual-checkin.dto';
import { CheckInResultDto } from './dto/check-in-result.dto';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

@ApiTags('Check-In')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'checkin', version: '1' })
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Roles(RoleEnum.staff)
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CheckInResultDto })
  scan(
    @Body() dto: ScanTicketDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<CheckInResultDto> {
    return this.checkInService.scan(dto, String(req.user.id));
  }

  @Roles(RoleEnum.staff)
  @Post('manual')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CheckInResultDto })
  manual(
    @Body() dto: ManualCheckInDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<CheckInResultDto> {
    return this.checkInService.manual(dto, String(req.user.id));
  }

  @Roles(RoleEnum.organizer, RoleEnum.admin)
  @Get('logs/:eventId')
  @HttpCode(HttpStatus.OK)
  getLogs(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<object[]> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.checkInService.getLogs(eventId, String(req.user.id), isAdmin);
  }
}
