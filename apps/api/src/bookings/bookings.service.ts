import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, In } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './domain/booking';
import { BookingStatusEnum } from './booking-status.enum';
import { BookingEntity } from './infrastructure/persistence/relational/entities/booking.entity';
import { BookingItemEntity } from '../booking-items/infrastructure/persistence/relational/entities/booking-item.entity';
import { TicketTypeEntity } from '../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { EventEntity } from '../events/infrastructure/persistence/relational/entities/event.entity';
import { EventStatusEnum } from '../events/event-status.enum';
import { TicketTypeStatusEnum } from '../ticket-types/ticket-type-status.enum';
import { BookingMapper } from './infrastructure/persistence/relational/mappers/booking.mapper';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export const BOOKING_EXPIRY_QUEUE = 'booking-expiry';
export const BOOKING_HOLD_MINUTES = 15;

export class BookingExpiredException extends HttpException {
  constructor() {
    super('Booking expired. Please create a new booking.', HttpStatus.GONE);
  }
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectQueue(BOOKING_EXPIRY_QUEUE)
    private readonly expiryQueue: Queue,
    private readonly promoCodesService: PromoCodesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

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

    return this.findByIdOrFail(bookingId);
  }

  /**
   * Expires a booking and releases held inventory (SPEC US-3.4).
   * Idempotent: only PENDING_PAYMENT bookings transition; re-runs no-op.
   */
  async expire(bookingId: string): Promise<void> {
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

      // Same deterministic lock order as create().
      const sorted = [...items].sort((a, b) =>
        a.ticketTypeId.localeCompare(b.ticketTypeId),
      );
      for (const item of sorted) {
        await manager
          .createQueryBuilder(TicketTypeEntity, 'tt')
          .setLock('pessimistic_write')
          .where('tt.id = :id', { id: item.ticketTypeId })
          .getOne();
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
    });
    return entities.map(BookingMapper.toDomain);
  }

  async findByIdForUser(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<Booking> {
    const booking = await this.findByIdOrFail(id);
    if (!isAdmin && booking.customerId !== String(userId)) {
      throw new ForbiddenException('Not your booking');
    }
    return booking;
  }

  async findByIdOrFail(id: string): Promise<Booking> {
    const entity = await this.dataSource
      .getRepository(BookingEntity)
      .findOne({ where: { id } });
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
}
