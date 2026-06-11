import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  RawBodyRequest,
  Req,
  Request,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { Request as ExpressRequest } from 'express';
import { CreateIntentResponseDto, PaymentsService } from './payments.service';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

@ApiTags('Payments')
@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent/:bookingId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.customer)
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
   *
   * VERSION_NEUTRAL: webhooks must be reachable at /api/payments/webhook
   * (the URL shown in NestJS startup logs and documented for stripe listen).
   * URI versioning adds /v1/ after the startup log is emitted, making the
   * versioned path /api/v1/payments/webhook — a URL operators would not know
   * to use. VERSION_NEUTRAL makes both paths resolve to this handler.
   */
  @Post('webhook')
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    this.logger.log(
      `webhook received: sig=${signature ? signature.slice(0, 20) + '…' : 'MISSING'} rawBody=${req.rawBody ? req.rawBody.length + 'B' : 'MISSING'}`,
    );

    if (!signature || !req.rawBody) {
      this.logger.error(
        `webhook rejected: missing ${!signature ? 'stripe-signature header' : 'raw body'}`,
      );
      throw new BadRequestException('Missing stripe-signature or raw body');
    }

    await this.paymentsService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
