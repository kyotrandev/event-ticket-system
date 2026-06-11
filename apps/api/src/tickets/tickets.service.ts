import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { toBuffer } from 'qrcode';
import { AllConfigType } from '../config/config.type';
import { Ticket } from './domain/ticket';
import { TicketStatusEnum } from './ticket-status.enum';
import { TicketEntity } from './infrastructure/persistence/relational/entities/ticket.entity';
import { TicketMapper } from './infrastructure/persistence/relational/mappers/ticket.mapper';
import { BookingEntity } from '../bookings/infrastructure/persistence/relational/entities/booking.entity';
import { BookingItemEntity } from '../booking-items/infrastructure/persistence/relational/entities/booking-item.entity';
import { RoleEnum } from '../roles/roles.enum';
import { EventEntity } from '../events/infrastructure/persistence/relational/entities/event.entity';
import { OrganizerTicketSummaryDto } from './dto/organizer-ticket-summary.dto';
import { InfinityPaginationResponseDto } from '../utils/dto/infinity-pagination-response.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  /**
   * SPEC §11: qrSecret = HMAC-SHA256(ticketCode + eventId + SERVER_SECRET).
   * Phase 4 check-in recomputes and rejects mismatches as INVALID.
   */
  computeQrSecret(code: string, eventId: string): string {
    const secret = this.configService.getOrThrow('ticket.qrSecret', {
      infer: true,
    });
    return createHmac('sha256', secret)
      .update(`${code}${eventId}`)
      .digest('hex');
  }

  verifyQrSecret(code: string, eventId: string, candidate: string): boolean {
    const expected = this.computeQrSecret(code, eventId);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(candidate, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Issues one ticket per purchased seat for a PAID booking.
   * Runs inside the payment-success transaction (same manager).
   */
  async issueForBooking(
    booking: BookingEntity,
    manager: EntityManager,
  ): Promise<TicketEntity[]> {
    const items = await manager.find(BookingItemEntity, {
      where: { bookingId: booking.id },
    });

    const tickets: TicketEntity[] = [];
    for (const item of items) {
      const eventId = item.ticketType.eventId;
      for (let seat = 0; seat < item.quantity; seat++) {
        const code = randomUUID();
        tickets.push(
          manager.create(TicketEntity, {
            bookingItemId: item.id,
            eventId,
            customerId: booking.customerId,
            code,
            qrSecret: this.computeQrSecret(code, eventId),
            status: TicketStatusEnum.ISSUED,
          }),
        );
      }
    }
    return manager.save(tickets);
  }

  async findMine(customerId: string): Promise<Ticket[]> {
    const entities = await this.dataSource.getRepository(TicketEntity).find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      relations: ['bookingItem', 'bookingItem.ticketType', 'bookingItem.ticketType.event'],
    });
    return entities.map(TicketMapper.toDomain);
  }

  /**
   * QR PNG for a ticket (SPEC US-3.5). Owner, staff and admin only.
   * The QR encodes { c: code, s: hmac } — exactly what Phase 4 scans.
   */
  async getQrPng(
    code: string,
    requester: { id: string; roleId?: number },
  ): Promise<Buffer> {
    const ticket = await this.dataSource
      .getRepository(TicketEntity)
      .findOne({ where: { code }, loadEagerRelations: false });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.assertCanViewTicket(ticket, requester);

    const payload = JSON.stringify({ c: ticket.code, s: ticket.qrSecret });
    return toBuffer(payload, { type: 'png', width: 320, margin: 2 });
  }

  /** Owner, staff (assigned), event organizer, or admin. */
  async assertCanViewTicket(
    ticket: TicketEntity,
    requester: { id: string; roleId?: number },
  ): Promise<void> {
    if (requester.roleId === RoleEnum.admin) return;
    if (ticket.customerId === String(requester.id)) return;

    if (requester.roleId === RoleEnum.staff) {
      const assigned = await this.dataSource.query(
        `SELECT 1 FROM event_staff_assignment WHERE "eventId" = $1 AND "staffId" = $2`,
        [ticket.eventId, requester.id],
      );
      if (assigned.length) return;
    }

    if (requester.roleId === RoleEnum.organizer) {
      const event = await this.dataSource
        .getRepository(EventEntity)
        .findOne({ where: { id: ticket.eventId } });
      if (event && String(event.organizerId) === requester.id) return;
    }

    throw new ForbiddenException('Not allowed to view this ticket');
  }

  async findByBookingId(
    bookingId: string,
    requester: { id: string; roleId?: number },
    isAdmin: boolean,
  ): Promise<Ticket[]> {
    const booking = await this.dataSource
      .getRepository(BookingEntity)
      .findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isCustomer = booking.customerId === String(requester.id);
    let isOrganizer = false;
    if (requester.roleId === RoleEnum.organizer) {
      const count = await this.dataSource
        .getRepository(BookingItemEntity)
        .createQueryBuilder('bi')
        .innerJoin('bi.ticketType', 'tt')
        .innerJoin('tt.event', 'e')
        .where('bi.bookingId = :bookingId', { bookingId })
        .andWhere('e.organizerId = :organizerId', { organizerId: requester.id })
        .getCount();
      isOrganizer = count > 0;
    }

    if (!isAdmin && !isCustomer && !isOrganizer) {
      throw new ForbiddenException('Not allowed to view tickets for this booking');
    }

    const items = await this.dataSource.getRepository(BookingItemEntity).find({
      where: { bookingId },
      select: ['id'],
    });
    if (!items.length) return [];

    const entities = await this.dataSource.getRepository(TicketEntity).find({
      where: { bookingItemId: In(items.map((i) => i.id)) },
      order: { createdAt: 'ASC' },
      relations: ['bookingItem', 'bookingItem.ticketType', 'bookingItem.ticketType.event'],
    });
    return entities.map(TicketMapper.toDomain);
  }

  async assertCanViewEventTickets(
    eventId: string,
    requesterId: string,
    roleId?: number,
  ): Promise<void> {
    if (roleId === RoleEnum.admin) return;

    const event = await this.dataSource
      .getRepository(EventEntity)
      .findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (String(event.organizerId) === requesterId) return;

    if (roleId === RoleEnum.staff) {
      const assigned = await this.dataSource.query(
        `SELECT 1 FROM event_staff_assignment WHERE "eventId" = $1 AND "staffId" = $2`,
        [eventId, requesterId],
      );
      if (assigned.length) return;
    }

    throw new ForbiddenException('Not allowed to view tickets for this event');
  }

  async findByOrganizer(
    organizerId: string,
    page: number,
    limit: number,
    filters: {
      eventId?: string;
      status?: TicketStatusEnum;
      keyword?: string;
    },
  ): Promise<InfinityPaginationResponseDto<OrganizerTicketSummaryDto>> {
    const cappedLimit = Math.min(limit, 50);
    const qb = this.dataSource
      .getRepository(TicketEntity)
      .createQueryBuilder('t')
      .innerJoin(EventEntity, 'e', 'e.id = t.eventId')
      .leftJoinAndSelect('t.bookingItem', 'bi')
      .leftJoinAndSelect('bi.ticketType', 'tt')
      .leftJoinAndSelect('bi.booking', 'booking')
      .where('e.organizerId = :organizerId', { organizerId })
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * cappedLimit)
      .take(cappedLimit + 1);

    if (filters.eventId) {
      qb.andWhere('t.eventId = :eventId', { eventId: filters.eventId });
    }
    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.keyword?.trim()) {
      const kw = `%${filters.keyword.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(t.code) LIKE :kw OR LOWER(e.name) LIKE :kw)`,
        { kw },
      );
    }

    const tickets = await qb.getMany();
    const hasNextPage = tickets.length > cappedLimit;
    const pageData = hasNextPage ? tickets.slice(0, cappedLimit) : tickets;

    if (!pageData.length) {
      return { data: [], hasNextPage: false };
    }

    const eventIds = [...new Set(pageData.map((t) => t.eventId))];
    const events = await this.dataSource.getRepository(EventEntity).find({
      where: { id: In(eventIds) },
    });
    const eventMap = new Map(events.map((e) => [e.id, e]));

    const customerIds = [...new Set(pageData.map((t) => Number(t.customerId)))];
    const users = await this.dataSource.query(
      `SELECT id, email, "firstName", "lastName" FROM "user" WHERE id = ANY($1)`,
      [customerIds],
    );
    const userMap = new Map(users.map((u: any) => [String(u.id), u]));

    const data: OrganizerTicketSummaryDto[] = pageData.map((t) => {
      const user = userMap.get(t.customerId) as any;
      const event = eventMap.get(t.eventId);
      return {
        id: t.id,
        code: t.code,
        status: t.status,
        createdAt: t.createdAt,
        eventId: t.eventId,
        eventName: event?.name ?? 'Unknown event',
        ticketTypeName: t.bookingItem?.ticketType?.name ?? null,
        customerName: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          : 'Unknown',
        customerEmail: user?.email ?? 'Unknown',
        bookingId: t.bookingItem?.booking?.id ?? t.bookingItem?.bookingId ?? null,
      };
    });

    return { data, hasNextPage };
  }

  async findAllForAdmin(
    page: number,
    limit: number,
    filters: {
      eventId?: string;
      status?: TicketStatusEnum;
      keyword?: string;
      organizerId?: string;
    },
  ): Promise<InfinityPaginationResponseDto<import('./dto/admin-ticket-summary.dto').AdminTicketSummaryDto>> {
    const cappedLimit = Math.min(limit, 50);
    const qb = this.dataSource
      .getRepository(TicketEntity)
      .createQueryBuilder('t')
      .innerJoin(EventEntity, 'e', 'e.id = t.eventId')
      .leftJoinAndSelect('t.bookingItem', 'bi')
      .leftJoinAndSelect('bi.ticketType', 'tt')
      .leftJoinAndSelect('bi.booking', 'booking')
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * cappedLimit)
      .take(cappedLimit + 1);

    if (filters.eventId) {
      qb.andWhere('t.eventId = :eventId', { eventId: filters.eventId });
    }
    if (filters.organizerId) {
      qb.andWhere('e.organizerId = :organizerId', {
        organizerId: filters.organizerId,
      });
    }
    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.keyword?.trim()) {
      const kw = `%${filters.keyword.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(t.code) LIKE :kw OR LOWER(e.name) LIKE :kw OR EXISTS (
          SELECT 1 FROM "user" u
          WHERE u.id = t."customerId"::int
            AND (LOWER(u.email) LIKE :kw OR LOWER(u."firstName") LIKE :kw OR LOWER(u."lastName") LIKE :kw)
        ))`,
        { kw },
      );
    }

    const tickets = await qb.getMany();
    const hasNextPage = tickets.length > cappedLimit;
    const pageData = hasNextPage ? tickets.slice(0, cappedLimit) : tickets;

    if (!pageData.length) {
      return { data: [], hasNextPage: false };
    }

    const eventIds = [...new Set(pageData.map((t) => t.eventId))];
    const events = await this.dataSource.getRepository(EventEntity).find({
      where: { id: In(eventIds) },
    });
    const eventMap = new Map(events.map((e) => [e.id, e]));

    const customerIds = [...new Set(pageData.map((t) => Number(t.customerId)))];
    const organizerIds = [...new Set(events.map((e) => Number(e.organizerId)))];
    const allUserIds = [...new Set([...customerIds, ...organizerIds])];
    const users = await this.dataSource.query(
      `SELECT id, email, "firstName", "lastName" FROM "user" WHERE id = ANY($1)`,
      [allUserIds],
    );
    const userMap = new Map(users.map((u: { id: number }) => [String(u.id), u]));

    const data = pageData.map((t) => {
      const user = userMap.get(t.customerId) as
        | { email: string; firstName: string | null; lastName: string | null }
        | undefined;
      const event = eventMap.get(t.eventId);
      const organizer = event
        ? (userMap.get(String(event.organizerId)) as
            | { email: string; firstName: string | null; lastName: string | null }
            | undefined)
        : undefined;
      return {
        id: t.id,
        code: t.code,
        status: t.status,
        createdAt: t.createdAt,
        eventId: t.eventId,
        eventName: event?.name ?? 'Unknown event',
        ticketTypeName: t.bookingItem?.ticketType?.name ?? null,
        customerName: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          : 'Unknown',
        customerEmail: user?.email ?? 'Unknown',
        bookingId: t.bookingItem?.booking?.id ?? t.bookingItem?.bookingId ?? null,
        organizerName: organizer
          ? `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() ||
            organizer.email
          : 'Unknown',
        organizerEmail: organizer?.email ?? 'Unknown',
      };
    });

    return { data, hasNextPage };
  }

  async findEventAttendees(
    eventId: string,
    requesterId: string,
    roleId?: number,
  ): Promise<any[]> {
    await this.assertCanViewEventTickets(eventId, requesterId, roleId);

    const tickets = await this.dataSource.getRepository(TicketEntity).find({
      where: { eventId },
      relations: ['bookingItem', 'bookingItem.ticketType'],
      order: { createdAt: 'DESC' },
    });

    if (!tickets.length) return [];

    const customerIds = [...new Set(tickets.map((t) => Number(t.customerId)))];
    
    const users = await this.dataSource.query(
      `SELECT id, email, "firstName", "lastName" FROM "user" WHERE id = ANY($1)`,
      [customerIds]
    );
    const userMap = new Map(users.map((u: any) => [String(u.id), u]));

    return tickets.map((t) => {
      const user = userMap.get(t.customerId) as any;
      return {
        id: t.id,
        code: t.code,
        status: t.status,
        createdAt: t.createdAt,
        ticketTypeName: t.bookingItem?.ticketType?.name,
        customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
        customerEmail: user?.email || 'Unknown',
      };
    });
  }

  async updateTicketStatus(ticketId: string, status: TicketStatusEnum): Promise<TicketEntity> {
    const ticket = await this.dataSource.getRepository(TicketEntity).findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    
    ticket.status = status;
    return this.dataSource.getRepository(TicketEntity).save(ticket);
  }

  async getTicketDetails(
    ticketId: string,
    requesterId: string,
    options?: { isAdmin?: boolean; roleId?: number },
  ): Promise<any> {
    const ticket = await this.dataSource.getRepository(TicketEntity).findOne({
      where: { id: ticketId },
      relations: ['bookingItem', 'bookingItem.booking', 'bookingItem.ticketType'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.assertCanViewTicket(ticket, {
      id: requesterId,
      roleId: options?.isAdmin ? RoleEnum.admin : options?.roleId,
    });
    const eventRows = await this.dataSource.query(
      `SELECT id, name, "organizerId", "startTime", "endTime", location, "bannerUrl" FROM event WHERE id = $1`,
      [ticket.eventId],
    );
    const event = eventRows[0];

    const customer = await this.dataSource.query(
      `SELECT id, email, "firstName", "lastName", "phoneNumber" FROM "user" WHERE id = $1`,
      [Number(ticket.customerId)],
    );

    const log = await this.dataSource.query(
      `SELECT "scannedAt", method, "staffId" FROM check_in_log WHERE "ticketId" = $1`,
      [ticket.id]
    );

    let checkInStaff = null;
    if (log.length > 0 && log[0].staffId) {
      const staffRows = await this.dataSource.query(
        `SELECT id, email, "firstName", "lastName" FROM "user" WHERE id = $1`,
        [Number(log[0].staffId)]
      );
      if (staffRows.length > 0) checkInStaff = staffRows[0];
    }

    return {
      id: ticket.id,
      code: ticket.code,
      status: ticket.status,
      createdAt: ticket.createdAt,
      ticketType: ticket.bookingItem?.ticketType,
      event: {
        id: event?.id,
        name: event?.name,
        startTime: event?.startTime,
        endTime: event?.endTime,
        location: event?.location,
        bannerUrl: event?.bannerUrl,
      },
      booking: {
        id: ticket.bookingItem?.booking?.id,
        createdAt: ticket.bookingItem?.booking?.createdAt,
      },
      customer: customer.length ? customer[0] : null,
      checkIn: log.length ? {
        scannedAt: log[0].scannedAt,
        method: log[0].method,
        staff: checkInStaff,
      } : null,
    };
  }
}
