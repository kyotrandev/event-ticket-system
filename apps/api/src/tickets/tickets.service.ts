import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
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

    const privileged =
      requester.roleId === RoleEnum.admin ||
      requester.roleId === RoleEnum.staff;
    if (!privileged && ticket.customerId !== String(requester.id)) {
      throw new ForbiddenException('Not your ticket');
    }

    const payload = JSON.stringify({ c: ticket.code, s: ticket.qrSecret });
    return toBuffer(payload, { type: 'png', width: 320, margin: 2 });
  }

  async findEventAttendees(eventId: string): Promise<any[]> {
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

  async getTicketDetails(ticketId: string, requesterId: string, isAdmin: boolean): Promise<any> {
    const ticket = await this.dataSource.getRepository(TicketEntity).findOne({
      where: { id: ticketId },
      relations: ['bookingItem', 'bookingItem.booking', 'bookingItem.ticketType'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const eventRows = await this.dataSource.query(
      `SELECT id, name, "organizerId", "startTime" FROM event WHERE id = $1`,
      [ticket.eventId]
    );
    const event = eventRows[0];

    if (!isAdmin) {
      const isAssigned = await this.dataSource.query(
        `SELECT 1 FROM event_staff_assignment WHERE "eventId" = $1 AND "staffId" = $2`,
        [ticket.eventId, requesterId]
      );
      if (!isAssigned.length && String(event?.organizerId) !== requesterId) {
        throw new ForbiddenException('Not assigned to this event or not organizer');
      }
    }

    const customer = await this.dataSource.query(
      `SELECT id, email, "firstName", "lastName", "phoneNumber" FROM "user" WHERE id = $1`,
      [Number(ticket.customerId)]
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
