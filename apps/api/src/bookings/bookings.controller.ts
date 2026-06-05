import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  SerializeOptions,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Booking } from './domain/booking';
import { AuthGuard } from '@nestjs/passport';
import { RoleEnum } from '../roles/roles.enum';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { FindAllBookingsDto } from './dto/find-all-bookings.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'bookings',
  version: '1',
})
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SerializeOptions({ groups: [] })
  @ApiCreatedResponse({ type: Booking })
  create(
    @Body() dto: CreateBookingDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<Booking> {
    return this.bookingsService.create(String(req.user.id), dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ groups: [] })
  @ApiOkResponse({ type: [Booking] })
  findMine(
    @Query() query: FindAllBookingsDto,
    @Request() req: { user: JwtPayloadType },
  ): Promise<Booking[]> {
    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 10, 50);
    return this.bookingsService.findMine(String(req.user.id), page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ groups: [] })
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiOkResponse({ type: Booking })
  findOne(
    @Param('id') id: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<Booking> {
    const isAdmin = req.user.role?.id === RoleEnum.admin;
    return this.bookingsService.findByIdForUser(
      id,
      String(req.user.id),
      isAdmin,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiNoContentResponse({ description: 'Booking cancelled and refund issued' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<void> {
    return this.bookingsService.cancel(id, String(req.user.id));
  }
}
