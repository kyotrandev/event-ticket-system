import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, EntityManager, In } from 'typeorm';
import Stripe from 'stripe';
import { AllConfigType } from '../config/config.type';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './domain/booking';
import { BookingStatusEnum } from './booking-status.enum';
import { BookingEntity } from './infrastructure/persistence/relational/entities/booking.entity';
import { BookingItemEntity } from '../booking-items/infrastructure/persistence/relational/entities/booking-item.entity';
import { TicketTypeEntity } from '../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { TicketEntity } from '../tickets/infrastructure/persistence/relational/entities/ticket.entity';
import { TicketStatusEnum } from '../tickets/ticket-status.enum';
import { PaymentEntity } from '../payments/infrastructure/persistence/relational/entities/payment.entity';
import { PaymentStatusEnum } from '../payments/payment-status.enum';
import { EventEntity } from '../events/infrastructure/persistence/relational/entities/event.entity';
import { EventStatusEnum } from '../events/event-status.enum';
import { TicketTypeStatusEnum } from '../ticket-types/ticket-type-status.enum';
import { BookingMapper } from './infrastructure/persistence/relational/mappers/booking.mapper';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MailService } from '../mail/mail.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { OrganizerBookingSummaryDto } from './dto/organizer-booking-summary.dto';
import { InfinityPaginationResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { NotificationsService } from '../notifications/notifications.service';

export const BOOKING_EXPIRY_QUEUE = 'booking-expiry';
export const BOOKING_HOLD_MINUTES = 15;

export class BookingExpiredException extends HttpException {
  constructor() {
    super('Booking expired. Please create a new booking.', HttpStatus.GONE);
  }
}

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private stripeClient: StripeClient | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectQueue(BOOKING_EXPIRY_QUEUE)
    private readonly expiryQueue: Queue,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly promoCodesService: PromoCodesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mailService: MailService,
    private readonly waitlistService: WaitlistService,
    private readonly notificationsService: NotificationsService,
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
   * Creates a booking with a 15-minute seat hold (SPEC US-3.1).
   *
   * Concurrency: ticket_type rows are locked FOR UPDATE inside one
   * transaction, in deterministic id order (prevents deadlocks between
   * interleaved multi-item bookings). reservedQty is incremented under
   * the lock, so soldQty + reservedQty can never exceed totalQty.
   */
  async create(customerId: string, dto: CreateBookingDto): Promise<Booking> {
    // Merge duplicate ticketTypeIds so each row is locked exactly once.
    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      quantities.set(
        item.ticketTypeId,
        (quantities.get(item.ticketTypeId) ?? 0) + item.quantity,
      );
    }
    const sortedIds = [...quantities.keys()].sort();

    const bookingId = await this.dataSource.transaction(async (manager) => {
      // Lock ticket types in deterministic order. orderBy makes Postgres
      // acquire row locks in a stable sequence across concurrent requests.
      const ticketTypes = await manager
        .createQueryBuilder(TicketTypeEntity, 'tt')
        .setLock('pessimistic_write')
        .where('tt.id IN (:...ids)', { ids: sortedIds })
        .orderBy('tt.id', 'ASC')
        .getMany();

      if (ticketTypes.length !== sortedIds.length) {
        throw new NotFoundException('Ticket type not found');
      }

      // Events are read without a lock; only quantity columns are contended.
      const eventIds = [...new Set(ticketTypes.map((tt) => tt.eventId))];
      const events = await manager.find(EventEntity, {
        where: { id: In(eventIds) },
      });
      const eventById = new Map(events.map((e) => [e.id, e]));

      const now = new Date();
      const perEventQty = new Map<string, number>();
      let subtotalAmount = 0;

      for (const tt of ticketTypes) {
        const qty = quantities.get(tt.id) ?? 0;
        const event = eventById.get(tt.eventId);

        if (
          !event ||
          ![EventStatusEnum.PUBLISHED, EventStatusEnum.ONGOING].includes(
            event.status,
          )
        ) {
          throw new BadRequestException(
            `Event for ticket type "${tt.name}" is not open for booking`,
          );
        }
        if (tt.status === TicketTypeStatusEnum.CLOSED || tt.saleEnd < now) {
          throw new BadRequestException(`Sales for "${tt.name}" have closed`);
        }
        if (tt.saleStart > now) {
          throw new BadRequestException(
            `Sales for "${tt.name}" have not started yet`,
          );
        }

        const remaining = tt.totalQty - tt.soldQty - tt.reservedQty;
        if (remaining < qty) {
          throw new BadRequestException(
            `Only ${Math.max(0, remaining)} tickets remaining for ${tt.name}`,
          );
        }

        perEventQty.set(tt.eventId, (perEventQty.get(tt.eventId) ?? 0) + qty);
        subtotalAmount += tt.price * qty;
      }

      for (const [eventId, qty] of perEventQty) {
        const event = eventById.get(eventId);
        if (event && qty > event.maxTicketsPerOrder) {
          throw new BadRequestException(
            `Maximum ${event.maxTicketsPerOrder} tickets per order`,
          );
        }
      }

      // Promo: validated here; usage is consumed at payment success
      // so expired/failed bookings never burn uses.
      let promoCodeId: string | null = null;
      let discountAmount = 0;
      if (dto.promoCode) {
        const result = await this.promoCodesService.validateForUse(
          dto.promoCode,
          subtotalAmount,
          manager,
        );
        promoCodeId = result.promoCode.id;
        discountAmount = result.discountAmount;
      }

      // Reserve inventory under the lock.
      for (const tt of ticketTypes) {
        await manager.increment(
          TicketTypeEntity,
          { id: tt.id },
          'reservedQty',
          quantities.get(tt.id) ?? 0,
        );
      }

      const booking = await manager.save(
        manager.create(BookingEntity, {
          customerId,
          status: BookingStatusEnum.PENDING_PAYMENT,
          expiresAt: new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000),
          promoCodeId,
          subtotalAmount,
          discountAmount,
          totalAmount: Math.max(0, subtotalAmount - discountAmount),
        }),
      );

      for (const tt of ticketTypes) {
        await manager.save(
          manager.create(BookingItemEntity, {
            bookingId: booking.id,
            ticketTypeId: tt.id,
            quantity: quantities.get(tt.id) ?? 0,
            unitPrice: tt.price,
          }),
        );
      }

      return booking.id;
    });

    // Enqueued after commit so a rollback never leaves a live job. The
    // payment-intent endpoint re-checks expiresAt (410) as a backstop in
    // case the process dies between commit and enqueue.
    await this.expiryQueue.add(
      'expire',
      { bookingId },
      {
        jobId: `expire-${bookingId}`,
        delay: BOOKING_HOLD_MINUTES * 60 * 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );

    // Mark NOTIFIED waitlist entries as FULFILLED for each purchased type.
    await Promise.allSettled(
      sortedIds.map((id) =>
        this.waitlistService.fulfillIfNotified(customerId, id),
      ),
    );

    return this.findByIdOrFail(bookingId);
  }

  /**
   * Cancels a booking (customer, event organizer, or admin).
   * - PENDING_PAYMENT: releases reserved inventory (same as expiry), no refund.
   * - PAID: Stripe refund + ticket cancellation.
   * Idempotent: REFUNDED / EXPIRED no-op for repeat calls.
   *
   * Customers are subject to the event cancellation window; organizers and
   * admins may cancel/refund at any time for bookings on their events.
   *
   * Refund is blocked when any ticket in the booking has been checked in (USED).
   */
  async cancel(
    bookingId: string,
    userId: string,
    options?: { roleId?: number; isAdmin?: boolean },
  ): Promise<void> {
    const booking = await this.findByIdOrFail(bookingId);
    const roleId = options?.roleId;
    const isAdmin = options?.isAdmin ?? false;
    const isCustomer = booking.customerId === String(userId);
    const isOrganizer =
      roleId === RoleEnum.organizer &&
      (await this.isOrganizerBooking(bookingId, String(userId)));

    if (!isAdmin && !isCustomer && !isOrganizer) {
      throw new ForbiddenException('Not allowed to cancel this booking');
    }

    const skipCancellationWindow = isAdmin || isOrganizer;

    if (
      booking.status === BookingStatusEnum.REFUNDED ||
      booking.status === BookingStatusEnum.EXPIRED
    ) {
      return;
    }

    if (booking.status === BookingStatusEnum.PENDING_PAYMENT) {
      await this.cancelPendingPayment(bookingId, userId, booking);
      return;
    }

    if (booking.status !== BookingStatusEnum.PAID) {
      throw new UnprocessableEntityException(
        `Only PENDING_PAYMENT or PAID bookings can be cancelled (current: ${booking.status})`,
      );
    }

    // Cancellation window (SPEC US-5.1) — customers only.
    if (!skipCancellationWindow) {
      const firstItem = await this.dataSource
        .getRepository(BookingItemEntity)
        .findOne({ where: { bookingId }, loadEagerRelations: false });
      if (firstItem) {
        const tt = await this.dataSource
          .getRepository(TicketTypeEntity)
          .findOne({
            where: { id: firstItem.ticketTypeId },
            loadEagerRelations: false,
          });
        if (tt) {
          const event = await this.dataSource
            .getRepository(EventEntity)
            .findOne({ where: { id: tt.eventId } });
          if (event) {
            const windowMs = event.cancellationWindowHours * 60 * 60 * 1000;
            const timeUntilEventMs = event.startTime.getTime() - Date.now();
            if (timeUntilEventMs <= windowMs) {
              throw new ForbiddenException(
                `Cancellation window has closed. No refunds available within ${event.cancellationWindowHours} hours of the event.`,
              );
            }
          }
        }
      }
    }

    await this.assertNoCheckedInTickets(bookingId);

    const cancelledTicketTypeQty = await this.dataSource.transaction(
      async (manager) => {
        const bk = await manager
          .createQueryBuilder(BookingEntity, 'b')
          .setLock('pessimistic_write')
          .where('b.id = :id', { id: bookingId })
          .getOne();
        if (!bk || bk.status !== BookingStatusEnum.PAID) {
          return new Map<string, number>(); // concurrent cancel won
        }

        await this.assertNoCheckedInTickets(bookingId, manager);

        const items = await manager.find(BookingItemEntity, {
          where: { bookingId },
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
        const qtyByType = new Map<string, number>();
        for (const item of items) {
          const tt = typeById.get(item.ticketTypeId);
          if (!tt) continue;
          const newSoldQty = Math.max(0, tt.soldQty - item.quantity);
          const newStatus =
            tt.status === TicketTypeStatusEnum.SOLD_OUT
              ? TicketTypeStatusEnum.AVAILABLE
              : tt.status;
          await manager.update(TicketTypeEntity, item.ticketTypeId, {
            soldQty: newSoldQty,
            status: newStatus,
          });
          qtyByType.set(
            item.ticketTypeId,
            (qtyByType.get(item.ticketTypeId) ?? 0) + item.quantity,
          );
        }

        // Cancel tickets
        await manager
          .createQueryBuilder()
          .update(TicketEntity)
          .set({ status: TicketStatusEnum.CANCELLED })
          .where('bookingItemId IN (:...itemIds)', {
            itemIds: items.map((i) => i.id),
          })
          .execute();

        // Issue Stripe refund (last step inside transaction for atomicity).
        // Skip for free bookings (stripePaymentIntentId starts with "free_").
        const payment = await manager.findOne(PaymentEntity, {
          where: { bookingId },
        });
        if (
          payment &&
          payment.status === PaymentStatusEnum.SUCCEEDED &&
          payment.amount > 0 &&
          !payment.stripePaymentIntentId.startsWith('free_')
        ) {
          const refund = await this.stripe.refunds.create(
            { payment_intent: payment.stripePaymentIntentId },
            { idempotencyKey: `refund-${bookingId}` },
          );
          payment.stripeRefundId = refund.id;
          payment.refundedAt = new Date();
          payment.status = PaymentStatusEnum.REFUNDED;
          await manager.save(payment);
        } else if (payment && payment.status === PaymentStatusEnum.SUCCEEDED) {
          // Free booking — mark refunded without Stripe
          payment.status = PaymentStatusEnum.REFUNDED;
          payment.refundedAt = new Date();
          await manager.save(payment);
        }

        await manager.update(BookingEntity, bookingId, {
          status: BookingStatusEnum.REFUNDED,
        });

        await this.auditLogsService.log(
          {
            userId,
            action: isOrganizer
              ? 'booking.cancelled_by_organizer'
              : 'booking.cancelled',
            entity: 'Booking',
            entityId: bookingId,
            payload: {
              totalAmount: bk.totalAmount,
              customerId: bk.customerId,
            },
          },
          manager,
        );

        return qtyByType;
      },
    );

    // Side effects after commit — email goes to the customer, not the actor.
    await Promise.allSettled([
      this.sendCancellationEmail(bookingId, booking.customerId),
      ...[...cancelledTicketTypeQty.entries()].map(([ticketTypeId, qty]) =>
        this.waitlistService.notifyNext(ticketTypeId, qty),
      ),
    ]);
  }

  private async sendCancellationEmail(
    bookingId: string,
    userId: string,
  ): Promise<void> {
    try {
      const [user, booking] = await Promise.all([
        this.dataSource
          .getRepository(UserEntity)
          .findOne({ where: { id: Number(userId) } }),
        this.dataSource
          .getRepository(BookingEntity)
          .findOne({ where: { id: bookingId }, loadEagerRelations: false }),
      ]);
      if (!user?.email || !booking) return;

      // Resolve event name from first booking item
      const item = await this.dataSource
        .getRepository(BookingItemEntity)
        .findOne({
          where: { bookingId },
          relations: { ticketType: { event: true } },
        });

      await this.mailService.bookingCancelled({
        to: user.email,
        data: {
          firstName: user.firstName ?? 'there',
          eventName: (item as any)?.ticketType?.event?.name ?? 'your event',
          refundAmount: booking.totalAmount,
        },
      });
    } catch (err) {
      this.logger.warn(
        `cancellation email failed for booking ${bookingId}: ${String(err)}`,
      );
    }
  }

  private async countCheckedInTickets(
    bookingId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const repo = manager
      ? manager.getRepository(TicketEntity)
      : this.dataSource.getRepository(TicketEntity);

    return repo
      .createQueryBuilder('t')
      .innerJoin(BookingItemEntity, 'bi', 'bi.id = t.bookingItemId')
      .where('bi.bookingId = :bookingId', { bookingId })
      .andWhere('t.status = :status', { status: TicketStatusEnum.USED })
      .getCount();
  }

  private async assertNoCheckedInTickets(
    bookingId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const checkedInCount = await this.countCheckedInTickets(bookingId, manager);
    if (checkedInCount > 0) {
      throw new ForbiddenException(
        'Cannot refund this booking because at least one ticket has already been checked in.',
      );
    }
  }

  /** Customer-initiated cancel while payment is still pending. */
  private async cancelPendingPayment(
    bookingId: string,
    userId: string,
    booking: Booking,
  ): Promise<void> {
    await this.removeExpiryJob(bookingId);
    const expired = await this.expire(bookingId);
    if (!expired) return;

    const items = booking.items ?? [];
    await this.auditLogsService.log({
      userId,
      action: 'booking.cancelled',
      entity: 'Booking',
      entityId: bookingId,
      payload: {
        reason: 'user_cancelled_pending',
        totalAmount: booking.totalAmount,
      },
    });
    await Promise.allSettled(
      items.map((item) =>
        this.waitlistService.notifyNext(item.ticketTypeId, item.quantity),
      ),
    );
  }

  private async removeExpiryJob(bookingId: string): Promise<void> {
    try {
      const job = await this.expiryQueue.getJob(`expire-${bookingId}`);
      if (job) await job.remove();
    } catch (err) {
      this.logger.warn(
        `failed to remove expiry job for booking ${bookingId}: ${String(err)}`,
      );
    }
  }

  /**
   * Expires a booking and releases held inventory (SPEC US-3.4).
   * Idempotent: only PENDING_PAYMENT bookings transition; re-runs no-op.
   */
  async expire(bookingId: string): Promise<boolean> {
    const expired = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .createQueryBuilder(BookingEntity, 'b')
        .setLock('pessimistic_write')
        .where('b.id = :id', { id: bookingId })
        .getOne();

      if (!booking || booking.status !== BookingStatusEnum.PENDING_PAYMENT) {
        return false;
      }

      const items = await manager.find(BookingItemEntity, {
        where: { bookingId },
        loadEagerRelations: false,
      });

      // Lock all rows with the IDENTICAL statement create() uses — same
      // statement, same plan, same lock acquisition order = deadlock-free.
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

      await manager.update(BookingEntity, bookingId, {
        status: BookingStatusEnum.EXPIRED,
      });
      return true;
    });

    if (expired) {
      await this.auditLogsService.log({
        action: 'booking.expired',
        entity: 'Booking',
        entityId: bookingId,
      });
    }
    return expired;
  }

  async findByOrganizer(
    organizerId: string,
    page: number,
    limit: number,
    filters: { eventId?: string; status?: BookingStatusEnum },
  ): Promise<InfinityPaginationResponseDto<OrganizerBookingSummaryDto>> {
    const cappedLimit = Math.min(limit, 50);
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .innerJoin('b.items', 'bi')
      .innerJoin('bi.ticketType', 'tt')
      .innerJoin('tt.event', 'e')
      .where('e.organizerId = :organizerId', { organizerId })
      .distinct(true)
      .orderBy('b.createdAt', 'DESC')
      .skip((page - 1) * cappedLimit)
      .take(cappedLimit + 1);

    if (filters.eventId) {
      qb.andWhere('e.id = :eventId', { eventId: filters.eventId });
    }
    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }

    const entities = await qb
      .leftJoinAndSelect('b.items', 'items')
      .leftJoinAndSelect('items.ticketType', 'ticketType')
      .leftJoinAndSelect('ticketType.event', 'event')
      .getMany();

    const hasNextPage = entities.length > cappedLimit;
    const pageData = hasNextPage ? entities.slice(0, cappedLimit) : entities;

    const customerIds = [...new Set(pageData.map((b) => Number(b.customerId)))];
    const users = customerIds.length
      ? await this.dataSource.getRepository(UserEntity).find({
          where: { id: In(customerIds) },
        })
      : [];
    const userMap = new Map(users.map((u) => [String(u.id), u]));

    const data: OrganizerBookingSummaryDto[] = pageData.map((b) => {
      const firstItem = b.items?.[0];
      const event = firstItem?.ticketType?.event;
      const customer = userMap.get(String(b.customerId));
      const ticketCount = (b.items ?? []).reduce((s, i) => s + i.quantity, 0);
      return {
        id: b.id,
        customerId: b.customerId,
        status: b.status,
        totalAmount: b.totalAmount,
        ticketCount,
        createdAt: b.createdAt,
        eventId: event?.id ?? firstItem?.ticketType?.eventId ?? '',
        eventName: event?.name ?? 'Unknown event',
        customerName: customer
          ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() ||
            (customer.email ?? 'Unknown')
          : 'Unknown',
        customerEmail: customer?.email ?? 'Unknown',
      };
    });

    return { data, hasNextPage };
  }

  async findAllForAdmin(
    page: number,
    limit: number,
    filters: {
      eventId?: string;
      status?: BookingStatusEnum;
      keyword?: string;
      organizerId?: string;
    },
  ): Promise<
    InfinityPaginationResponseDto<
      import('./dto/admin-booking-summary.dto').AdminBookingSummaryDto
    >
  > {
    const cappedLimit = Math.min(limit, 50);
    const qb = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .innerJoin('b.items', 'bi')
      .innerJoin('bi.ticketType', 'tt')
      .innerJoin('tt.event', 'e')
      .distinct(true)
      .orderBy('b.createdAt', 'DESC')
      .skip((page - 1) * cappedLimit)
      .take(cappedLimit + 1);

    if (filters.eventId) {
      qb.andWhere('e.id = :eventId', { eventId: filters.eventId });
    }
    if (filters.organizerId) {
      qb.andWhere('e.organizerId = :organizerId', {
        organizerId: filters.organizerId,
      });
    }
    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters.keyword?.trim()) {
      const kw = `%${filters.keyword.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(e.name) LIKE :kw OR LOWER(b.id::text) LIKE :kw OR EXISTS (
          SELECT 1 FROM "user" u
          WHERE u.id = b."customerId"::int
            AND (LOWER(u.email) LIKE :kw OR LOWER(u."firstName") LIKE :kw OR LOWER(u."lastName") LIKE :kw)
        ))`,
        { kw },
      );
    }

    const entities = await qb
      .leftJoinAndSelect('b.items', 'items')
      .leftJoinAndSelect('items.ticketType', 'ticketType')
      .leftJoinAndSelect('ticketType.event', 'event')
      .getMany();

    const hasNextPage = entities.length > cappedLimit;
    const pageData = hasNextPage ? entities.slice(0, cappedLimit) : entities;

    const customerIds = [...new Set(pageData.map((b) => Number(b.customerId)))];
    const organizerIds = [
      ...new Set(
        pageData
          .map((b) => b.items?.[0]?.ticketType?.event?.organizerId)
          .filter(Boolean)
          .map(String),
      ),
    ];
    const allUserIds = [
      ...new Set([...customerIds, ...organizerIds.map(Number)]),
    ];
    const users = allUserIds.length
      ? await this.dataSource.getRepository(UserEntity).find({
          where: { id: In(allUserIds) },
        })
      : [];
    const userMap = new Map(users.map((u) => [String(u.id), u]));

    const data = pageData.map((b) => {
      const firstItem = b.items?.[0];
      const event = firstItem?.ticketType?.event;
      const customer = userMap.get(String(b.customerId));
      const organizer = event?.organizerId
        ? userMap.get(String(event.organizerId))
        : undefined;
      const ticketCount = (b.items ?? []).reduce((s, i) => s + i.quantity, 0);
      return {
        id: b.id,
        customerId: b.customerId,
        status: b.status,
        totalAmount: b.totalAmount,
        ticketCount,
        createdAt: b.createdAt,
        eventId: event?.id ?? firstItem?.ticketType?.eventId ?? '',
        eventName: event?.name ?? 'Unknown event',
        customerName: customer
          ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() ||
            (customer.email ?? 'Unknown')
          : 'Unknown',
        customerEmail: customer?.email ?? 'Unknown',
        organizerName: organizer
          ? `${organizer.firstName ?? ''} ${organizer.lastName ?? ''}`.trim() ||
            (organizer.email ?? 'Unknown')
          : 'Unknown',
        organizerEmail: organizer?.email ?? 'Unknown',
      };
    });

    return { data, hasNextPage };
  }

  async isOrganizerBooking(
    bookingId: string,
    organizerId: string,
  ): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(BookingItemEntity)
      .createQueryBuilder('bi')
      .innerJoin('bi.ticketType', 'tt')
      .innerJoin('tt.event', 'e')
      .where('bi.bookingId = :bookingId', { bookingId })
      .andWhere('e.organizerId = :organizerId', { organizerId })
      .getCount();
    return count > 0;
  }

  async findMine(
    customerId: string,
    page: number,
    limit: number,
  ): Promise<Booking[]> {
    const entities = await this.dataSource.getRepository(BookingEntity).find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['items', 'items.ticketType', 'items.ticketType.event'],
    });
    return entities.map(BookingMapper.toDomain);
  }

  async findByIdForUser(
    id: string,
    userId: string,
    isAdmin: boolean,
    roleId?: number,
  ): Promise<Booking> {
    const booking = await this.findByIdOrFail(id);
    if (isAdmin || booking.customerId === String(userId)) {
      return booking;
    }
    if (roleId === RoleEnum.organizer) {
      const owns = await this.isOrganizerBooking(id, String(userId));
      if (owns) return booking;
    }
    throw new ForbiddenException('Not your booking');
  }

  async findByIdOrFail(id: string): Promise<Booking> {
    const entity = await this.dataSource.getRepository(BookingEntity).findOne({
      where: { id },
      relations: ['items', 'items.ticketType', 'items.ticketType.event'],
    });
    if (!entity) {
      throw new NotFoundException('Booking not found');
    }
    return BookingMapper.toDomain(entity);
  }

  /** Guard shared with payments: booking must be payable right now. */
  assertPayable(booking: Booking): void {
    if (booking.status !== BookingStatusEnum.PENDING_PAYMENT) {
      throw new UnprocessableEntityException(
        `Booking is ${booking.status}, not payable`,
      );
    }
    if (booking.expiresAt < new Date()) {
      // 410 Gone per SPEC US-3.3.
      throw new BookingExpiredException();
    }
  }

  /**
   * Called when an event is cancelled by the organizer.
   * Cancels all PAID bookings, refunds them via Stripe, and notifies customers.
   */
  async cancelEventBookings(eventId: string): Promise<void> {
    const items = await this.dataSource.getRepository(BookingItemEntity).find({
      where: { ticketType: { eventId } },
      relations: ['ticketType'],
    });
    if (!items.length) return;
    const bookingIds = [...new Set(items.map((i) => i.bookingId))];
    const bookings = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .where('b.id IN (:...bookingIds)', { bookingIds })
      .andWhere('b.status = :status', { status: BookingStatusEnum.PAID })
      .getMany();

    for (const bk of bookings) {
      try {
        const checkedInCount = await this.countCheckedInTickets(bk.id);
        if (checkedInCount > 0) {
          this.logger.warn(
            `Skipping refund for booking ${bk.id}: ${checkedInCount} ticket(s) already checked in`,
          );
          continue;
        }

        await this.dataSource.transaction(async (manager) => {
          const lockedBk = await manager
            .createQueryBuilder(BookingEntity, 'b')
            .setLock('pessimistic_write')
            .where('b.id = :id', { id: bk.id })
            .getOne();
          if (!lockedBk || lockedBk.status !== BookingStatusEnum.PAID) return;

          await this.assertNoCheckedInTickets(bk.id, manager);

          const bkItems = await manager.find(BookingItemEntity, {
            where: { bookingId: bk.id },
            loadEagerRelations: false,
          });

          // Cancel tickets
          if (bkItems.length > 0) {
            await manager
              .createQueryBuilder()
              .update(TicketEntity)
              .set({ status: TicketStatusEnum.CANCELLED })
              .where('bookingItemId IN (:...itemIds)', {
                itemIds: bkItems.map((i) => i.id),
              })
              .execute();
          }

          // Issue Stripe refund
          const payment = await manager.findOne(PaymentEntity, {
            where: { bookingId: bk.id },
          });
          if (
            payment &&
            payment.status === PaymentStatusEnum.SUCCEEDED &&
            payment.amount > 0 &&
            !payment.stripePaymentIntentId.startsWith('free_') &&
            !payment.stripePaymentIntentId.startsWith('pi_demo_')
          ) {
            const refund = await this.stripe.refunds.create(
              { payment_intent: payment.stripePaymentIntentId },
              { idempotencyKey: `bulk-refund-${bk.id}` },
            );
            payment.stripeRefundId = refund.id;
            payment.refundedAt = new Date();
            payment.status = PaymentStatusEnum.REFUNDED;
            await manager.save(payment);
          } else if (
            payment &&
            payment.status === PaymentStatusEnum.SUCCEEDED
          ) {
            payment.status = PaymentStatusEnum.REFUNDED;
            payment.refundedAt = new Date();
            await manager.save(payment);
          }

          await manager.update(BookingEntity, bk.id, {
            status: BookingStatusEnum.REFUNDED,
          });
        });

        // Send email
        await this.sendCancellationEmail(bk.id, bk.customerId.toString());

        // Send realtime notification
        await this.notificationsService.create({
          userId: bk.customerId.toString(),
          title: 'Event Cancelled',
          content:
            'An event you booked has been unexpectedly cancelled. Your refund is being processed.',
          type: 'EVENT_CANCELLED',
          relatedEntityId: eventId,
        });
      } catch (err) {
        this.logger.error(
          `Failed to cancel booking ${bk.id} during event cancellation`,
          err,
        );
      }
    }
  }
}
