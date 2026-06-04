import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express';
import { CreateIntentResponseDto, PaymentsService } from './payments.service';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

@ApiTags('Payments')
@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent/:bookingId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'bookingId', type: String, required: true })
  @ApiOkResponse({ type: CreateIntentResponseDto })
  createIntent(
    @Param('bookingId') bookingId: string,
    @Request() req: { user: JwtPayloadType },
  ): Promise<CreateIntentResponseDto> {
    return this.paymentsService.createIntent(bookingId, String(req.user.id));
  }

  /**
   * Stripe webhook (public; authenticated by signature). Reads the raw
   * request body — JSON re-serialization would break the signature.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    if (!signature || !req.rawBody) {
      throw new BadRequestException('Missing stripe-signature or raw body');
    }
    await this.paymentsService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
