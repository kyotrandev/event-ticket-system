import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, UpdateResult } from 'typeorm';
import { CheckInLogRelationalRepository } from './infrastructure/persistence/relational/repositories/check-in-log.repository';
import { EventStaffAssignmentsService } from '../event-staff-assignments/event-staff-assignments.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketEntity } from '../tickets/infrastructure/persistence/relational/entities/ticket.entity';
import { TicketStatusEnum } from '../tickets/ticket-status.enum';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { EventEntity } from '../events/infrastructure/persistence/relational/entities/event.entity';
import { CheckInMethodEnum } from './check-in-method.enum';
import { CheckInResultDto } from './dto/check-in-result.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CheckInService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logRepo: CheckInLogRelationalRepository,
    private readonly staffService: EventStaffAssignmentsService,
    private readonly ticketsService: TicketsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async resolveUserName(userId: string): Promise<string> {
    const user = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { id: Number(userId) }, loadEagerRelations: false });
    if (!user) return 'Unknown';
    return (
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.email ||
      'Unknown'
    );
  }

  /**
   * Attempts ISSUED→USED. Returns true if this call won (affected=1).
   */
  private async atomicCheckIn(ticketId: string): Promise<boolean> {
    const result: UpdateResult = await this.dataSource
      .getRepository(TicketEntity)
      .createQueryBuilder()
      .update()
      .set({ status: TicketStatusEnum.USED })
      .where('id = :id AND status = :status', {
        id: ticketId,
        status: TicketStatusEnum.ISSUED,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  private async performCheckIn(
    ticket: TicketEntity,
    staffId: string,
    method: CheckInMethodEnum,
  ): Promise<CheckInResultDto> {
    const attendeeName = await this.resolveUserName(ticket.customerId);
    const ticketTypeName = ticket.bookingItem?.ticketType?.name ?? 'Unknown';

    if (ticket.status === TicketStatusEnum.ISSUED) {
      const won = await this.atomicCheckIn(ticket.id);
      if (won) {
        await this.logRepo.create({
          ticketId: ticket.id,
          eventId: ticket.eventId,
          staffId,
          method,
        });

        this.notificationsService.emitToEvent(
          ticket.eventId,
          'CHECKIN_UPDATE',
          {
            ticketCode: ticket.code,
            attendeeName,
            ticketTypeName,
            scannedAt: new Date(),
          },
        );

        return {
          status: 'VALID',
          attendeeName,
          ticketTypeName,
          ticketCode: ticket.code,
        };
      }
    }

    // Ticket already USED (or race lost)
    const log = await this.logRepo.findByTicket(ticket.id);
    if (!log) return { status: 'INVALID' };

    const staffName = await this.resolveUserName(log.staffId);
    return {
      status: 'ALREADY_USED',
      attendeeName,
      ticketTypeName,
      originalScannedAt: log.scannedAt,
      staffName,
    };
  }

  async scan(
    dto: { code: string; eventId: string; s: string },
    staffId: string,
  ): Promise<CheckInResultDto> {
    if (!this.ticketsService.verifyQrSecret(dto.code, dto.eventId, dto.s)) {
      return { status: 'INVALID' };
    }

    const ticket = await this.dataSource
      .getRepository(TicketEntity)
      .findOne({ where: { code: dto.code, eventId: dto.eventId } });
    if (!ticket) return { status: 'INVALID' };

    if (!(await this.staffService.isAssigned(dto.eventId, staffId))) {
      throw new ForbiddenException('Not assigned to this event.');
    }

    return this.performCheckIn(ticket, staffId, CheckInMethodEnum.QR);
  }

  async manual(
    dto: { code: string; eventId: string },
    staffId: string,
  ): Promise<CheckInResultDto> {
    const ticket = await this.dataSource
      .getRepository(TicketEntity)
      .findOne({ where: { code: dto.code, eventId: dto.eventId } });
    if (!ticket) return { status: 'NOT_FOUND' };

    if (!(await this.staffService.isAssigned(dto.eventId, staffId))) {
      throw new ForbiddenException('Not assigned to this event.');
    }

    return this.performCheckIn(ticket, staffId, CheckInMethodEnum.MANUAL);
  }

  async getLogs(
    eventId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<object[]> {
    if (!isAdmin) {
      const event = await this.dataSource
        .getRepository(EventEntity)
        .findOne({ where: { id: eventId }, loadEagerRelations: false });
      if (!event) throw new NotFoundException('Event not found');
      if (String(event.organizerId) !== requesterId) {
        throw new ForbiddenException('Organizer only.');
      }
    }

    const logs = await this.logRepo.findByEvent(eventId);
    if (!logs.length) return [];

    const ticketIds = logs.map((l) => l.ticketId);
    const staffIds = [...new Set(logs.map((l) => l.staffId))];

    const [tickets, staffUsers] = await Promise.all([
      this.dataSource.getRepository(TicketEntity).findByIds(ticketIds),
      this.dataSource.getRepository(UserEntity).findByIds(staffIds.map(Number)),
    ]);

    const ticketMap = new Map(tickets.map((t) => [t.id, t]));
    const staffMap = new Map(staffUsers.map((u) => [String(u.id), u]));

    // Resolve attendee names
    const customerIds = [
      ...new Set(
        tickets
          .map((t) => t.customerId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const customers = customerIds.length
      ? await this.dataSource
          .getRepository(UserEntity)
          .findByIds(customerIds.map(Number))
      : [];
    const customerMap = new Map(customers.map((u) => [String(u.id), u]));

    const userName = (u: UserEntity | undefined) =>
      u
        ? [u.firstName, u.lastName].filter(Boolean).join(' ') ||
          u.email ||
          'Unknown'
        : 'Unknown';

    return logs.map((log) => {
      const ticket = ticketMap.get(log.ticketId);
      const customer = ticket ? customerMap.get(ticket.customerId) : undefined;
      const staff = staffMap.get(log.staffId);
      return {
        ticketCode: ticket ? ticket.code.substring(0, 8) + '...' : 'unknown',
        attendeeName: userName(customer as UserEntity | undefined),
        ticketTypeName: ticket?.bookingItem?.ticketType?.name ?? 'Unknown',
        scannedAt: log.scannedAt,
        method: log.method,
        staffName: userName(staff as UserEntity | undefined),
      };
    });
  }
}
