import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { WaitlistEntry } from './domain/waitlist-entry';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

@ApiTags('Waitlist')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'waitlist', version: '1' })
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: WaitlistEntry })
  join(
    @Body() dto: JoinWaitlistDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<WaitlistEntry> {
    return this.waitlistService.join(String(req.user.id), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<void> {
    return this.waitlistService.leave(id, String(req.user.id));
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [WaitlistEntry] })
  listMine(@Request() req: { user: JwtPayloadType }): Promise<WaitlistEntry[]> {
    return this.waitlistService.listMine(String(req.user.id));
  }
}
