import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, EntityManager } from 'typeorm';
import Stripe from 'stripe';
import { AllConfigType } from '../config/config.type';
import { Payment } from './domain/payment';
import { PaymentStatusEnum } from './payment-status.enum';
import { PaymentEntity } from './infrastructure/persistence/relational/entities/payment.entity';
import { PaymentMapper } from './infrastructure/persistence/relational/mappers/payment.mapper';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatusEnum } from '../bookings/booking-status.enum';
import { BookingEntity } from '../bookings/infrastructure/persistence/relational/entities/booking.entity';
import { BookingItemEntity } from '../booking-items/infrastructure/persistence/relational/entities/booking-item.entity';
import { TicketTypeEntity } from '../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { TicketTypeStatusEnum } from '../ticket-types/ticket-type-status.enum';
import { TicketsService } from '../tickets/tickets.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export const TICKET_DELIVERY_QUEUE = 'ticket-delivery';

// stripe v22 CJS typings don't surface namespace members (Stripe.Event,
// Stripe.PaymentIntent), so derive what we need structurally.
type StripeClient = InstanceType<typeof Stripe>;
type StripeEvent = ReturnType<StripeClient['webhooks']['constructEvent']>;
interface PaymentIntentLike {
  id: string;
  amount: number;
  client_secret: string | null;
  metadata?: Record<string, string>;
}

export class CreateIntentResponseDto {
  clientSecret: string | null;
  paymentId: string;
  // 'paid' only for zero-amount (fully discounted / free) bookings,
  // which are fulfilled immediately without Stripe.
  status: 'requires_payment' | 'paid';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripeClient: StripeClient | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectQueue(TICKET_DELIVERY_QUEUE)
    private readonly deliveryQueue: Queue,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly bookingsService: BookingsService,
    private readonly ticketsService: TicketsService,
    private readonly promoCodesService: PromoCodesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private get stripe(): StripeClient {
    if (!this.stripeClient) {
      const secretKey = this.configService.get('stripe.secretKey', {
        infer: true,
      });
      if (!secretKey) {
        throw new UnprocessableEntityException(
          'Stripe is not configured (STRIPE_SECRET_KEY missing)',
        );
      }
      this.stripeClient = new Stripe(secretKey);
    }
    return this.stripeClient;
  }

  /**
   * Creates (or re-uses) a Stripe PaymentIntent for a payable booking.
   *
   * VND is a zero-decimal currency in Stripe — totalAmount passes through
   * UNSCALED (350000 VND → amount: 350000, never ×100).
   */
  async createIntent(
    bookingId: string,
    userId: string,
  ): Promise<CreateIntentResponseDto> {
    const booking = await this.bookingsService.findByIdForUser(
      bookingId,
      userId,
      false,
    );
    this.bookingsService.assertPayable(booking);

    // Fully discounted / free bookings skip Stripe entirely.
    if (booking.totalAmount === 0) {
      const paymentId = await this.fulfill(`free_${bookingId}`, {
        bookingId,
        amount: 0,
      });
      return { clientSecret: null, paymentId, status: 'paid' };
    }

    const paymentRepo = this.dataSource.getRepository(PaymentEntity);
    const existing = await paymentRepo.findOne({ where: { bookingId } });

    if (existing && existing.status === PaymentStatusEnum.PENDING) {
      const intent = await this.stripe.paymentIntents.retrieve(
        existing.stripePaymentIntentId,
      );
      return {
        clientSecret: intent.client_secret,
        paymentId: existing.id,
        status: 'requires_payment',
      };
    }
    if (existing && existing.status === PaymentStatusEnum.SUCCEEDED) {
      throw new UnprocessableEntityException('Booking is already paid');
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: booking.totalAmount,
      currency: 'vnd',
      metadata: { bookingId },
      automatic_payment_methods: { enabled: true },
    });

    const payment = await paymentRepo.save(
      paymentRepo.create({
        bookingId,
        stripePaymentIntentId: intent.id,
        amount: booking.totalAmount,
        currency: 'vnd',
        status: PaymentStatusEnum.PENDING,
      }),
    );

    return {
      clientSecret: intent.client_secret,
      paymentId: payment.id,
      status: 'requires_payment',
    };
  }

  /** Verifies the Stripe signature and dispatches the event. */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get('stripe.webhookSecret', {
      infer: true,
    });
    if (!webhookSecret) {
      throw new UnprocessableEntityException(
        'Stripe webhook is not configured',
      );
    }

    let event: StripeEvent;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as unknown as PaymentIntentLike;
        await this.fulfill(intent.id, {
          bookingId: intent.metadata?.bookingId,
          amount: intent.amount,
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as unknown as PaymentIntentLike;
        await this.markFailed(intent.id);
        break;
      }
      default:
        this.logger.debug(`ignoring webhook event ${event.type}`);
    }
  }

  /**
   * Fulfills a paid booking exactly once (SPEC US-3.3 idempotency
   * invariant): booking → PAID, soldQty/reservedQty shifted, tickets
   * issued, promo use consumed, AuditLog written — all in one
   * transaction keyed on the unique stripePaymentIntentId.
   *
   * Returns the payment row id.
   */
  private async fulfill(
    stripePaymentIntentId: string,
    fallback: { bookingId?: string; amount?: number },
  ): Promise<string> {
    const result = await this.dataSource.transaction(async (manager) => {
      // Lock (or create) the payment row — this is the idempotency gate.
      let payment = await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.stripePaymentIntentId = :pi', { pi: stripePaymentIntentId })
        .getOne();

      if (payment?.status === PaymentStatusEnum.SUCCEEDED) {
        return { paymentId: payment.id, fulfilled: false }; // duplicate webhook
      }

      if (!payment) {
        if (!fallback.bookingId) {
          throw new NotFoundException(
            `No payment for intent ${stripePaymentIntentId}`,
          );
        }
        payment = manager.create(PaymentEntity, {
          bookingId: fallback.bookingId,
          stripePaymentIntentId,
          amount: fallback.amount ?? 0,
          currency: 'vnd',
          status: PaymentStatusEnum.PENDING,
        });
        payment = await manager.save(payment);
      }

      const booking = await manager
        .createQueryBuilder(BookingEntity, 'b')
        .setLock('pessimistic_write')
        .where('b.id = :id', { id: payment.bookingId })
        .getOne();
      if (!booking) {
        throw new NotFoundException('Booking not found for payment');
      }

      if (booking.status !== BookingStatusEnum.PENDING_PAYMENT) {
        // Payment landed after expiry released the hold: record it and
        // surface for manual refund (automated refund arrives in Phase 5).
        payment.status = PaymentStatusEnum.SUCCEEDED;
        await manager.save(payment);
        await this.auditLogsService.log(
          {
            action: 'payment.succeeded_after_expiry',
            entity: 'Booking',
            entityId: booking.id,
            payload: { stripePaymentIntentId, bookingStatus: booking.status },
          },
          manager,
        );
        return { paymentId: payment.id, fulfilled: false };
      }

      // Shift inventory reserved → sold. Rows are locked with the IDENTICAL
      // statement bookings.create() uses (same statement → same plan → same
      // lock acquisition order = deadlock-free across all paths).
      const items = await manager.find(BookingItemEntity, {
        where: { bookingId: booking.id },
        loadEagerRelations: false,
      });
      const ids = [...new Set(items.map((i) => i.ticketTypeId))].sort();
      const lockedTypes = await manager
        .createQueryBuilder(TicketTypeEntity, 'tt')
        .setLock('pessimistic_write')
        .where('tt.id IN (:...ids)', { ids })
        .orderBy('tt.id', 'ASC')
        .getMany();
      const typeById = new Map(lockedTypes.map((tt) => [tt.id, tt]));
      for (const item of items) {
        const tt = typeById.get(item.ticketTypeId);
        if (!tt) continue;
        await manager.update(TicketTypeEntity, item.ticketTypeId, {
          soldQty: tt.soldQty + item.quantity,
          reservedQty: Math.max(0, tt.reservedQty - item.quantity),
          // SPEC US-2.4: sold out exactly when soldQty reaches totalQty.
          status:
            tt.soldQty + item.quantity >= tt.totalQty
              ? TicketTypeStatusEnum.SOLD_OUT
              : tt.status,
        });
      }

      booking.status = BookingStatusEnum.PAID;
      await manager.save(booking);

      payment.status = PaymentStatusEnum.SUCCEEDED;
      await manager.save(payment);

      await this.ticketsService.issueForBooking(booking, manager);

      // Promo usage is consumed here (payment success), not at booking
      // creation — expired bookings never burn uses (see PromoCodesService).
      if (booking.promoCodeId) {
        const consumed = await this.promoCodesService.consumeUse(
          booking.promoCodeId,
          manager,
        );
        if (!consumed) {
          await this.auditLogsService.log(
            {
              action: 'promo.limit_exceeded_at_fulfillment',
              entity: 'PromoCode',
              entityId: booking.promoCodeId,
              payload: { bookingId: booking.id },
            },
            manager,
          );
        }
      }

      await this.auditLogsService.log(
        {
          userId: booking.customerId,
          action: 'payment.succeeded',
          entity: 'Booking',
          entityId: booking.id,
          payload: { stripePaymentIntentId, amount: payment.amount },
        },
        manager,
      );

      return { paymentId: payment.id, fulfilled: true };
    });

    if (result.fulfilled) {
      const payment = await this.dataSource
        .getRepository(PaymentEntity)
        .findOneByOrFail({ id: result.paymentId });
      await this.deliveryQueue.add(
        'deliver',
        { bookingId: payment.bookingId },
        {
          jobId: `deliver-${payment.bookingId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: true,
        },
      );
    }

    return result.paymentId;
  }

  /** payment_intent.payment_failed → booking FAILED, hold released. */
  private async markFailed(stripePaymentIntentId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.stripePaymentIntentId = :pi', { pi: stripePaymentIntentId })
        .getOne();
      if (!payment || payment.status === PaymentStatusEnum.FAILED) {
        return;
      }
      payment.status = PaymentStatusEnum.FAILED;
      await manager.save(payment);

      const booking = await manager
        .createQueryBuilder(BookingEntity, 'b')
        .setLock('pessimistic_write')
        .where('b.id = :id', { id: payment.bookingId })
        .getOne();
      if (!booking || booking.status !== BookingStatusEnum.PENDING_PAYMENT) {
        return;
      }

      const items = await manager.find(BookingItemEntity, {
        where: { bookingId: booking.id },
        loadEagerRelations: false,
      });
      // Identical locking statement as create()/fulfill() — see fulfill().
      const ids = [...new Set(items.map((i) => i.ticketTypeId))].sort();
      await manager
        .createQueryBuilder(TicketTypeEntity, 'tt')
        .setLock('pessimistic_write')
        .where('tt.id IN (:...ids)', { ids })
        .orderBy('tt.id', 'ASC')
        .getMany();
      for (const item of items) {
        await manager.decrement(
          TicketTypeEntity,
          { id: item.ticketTypeId },
          'reservedQty',
          item.quantity,
        );
      }

      booking.status = BookingStatusEnum.FAILED;
      await manager.save(booking);

      await this.auditLogsService.log(
        {
          userId: booking.customerId,
          action: 'payment.failed',
          entity: 'Booking',
          entityId: booking.id,
          payload: { stripePaymentIntentId },
        },
        manager,
      );
    });
  }

  async findByBookingId(
    bookingId: string,
    manager?: EntityManager,
  ): Promise<Payment | null> {
    const repo = (manager ?? this.dataSource.manager).getRepository(
      PaymentEntity,
    );
    const entity = await repo.findOne({ where: { bookingId } });
    return entity ? PaymentMapper.toDomain(entity) : null;
  }
}
