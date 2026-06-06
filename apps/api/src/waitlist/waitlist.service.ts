import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { WaitlistEntryRelationalRepository } from './infrastructure/persistence/relational/repositories/waitlist-entry.repository';
import { WaitlistEntry } from './domain/waitlist-entry';
import { WaitlistEntryMapper } from './infrastructure/persistence/relational/mappers/waitlist-entry.mapper';
import { WaitlistStatusEnum } from './waitlist-status.enum';
import { TicketTypeEntity } from '../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

export const WAITLIST_EXPIRY_QUEUE = 'waitlist-expiry';
export const WAITLIST_NOTIFY_HOURS = 48;

@Injectable()
export class WaitlistService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue(WAITLIST_EXPIRY_QUEUE) private readonly expiryQueue: Queue,
    private readonly repo: WaitlistEntryRelationalRepository,
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async join(userId: string, dto: JoinWaitlistDto): Promise<WaitlistEntry> {
    const ticketType = await this.dataSource
      .getRepository(TicketTypeEntity)
      .findOne({
        where: { id: dto.ticketTypeId },
        loadEagerRelations: false,
      });
    if (!ticketType) throw new NotFoundException('Ticket type not found');

    const existing = await this.repo.findActiveByUserAndTicketType(
      userId,
      dto.ticketTypeId,
    );
    if (existing) {
      throw new ConflictException('Already on waitlist for this ticket type');
    }

    const entry = await this.repo.create({
      userId,
      ticketTypeId: dto.ticketTypeId,
      eventId: ticketType.eventId,
    });
    return WaitlistEntryMapper.toDomain(entry);
  }

  async leave(entryId: string, userId: string): Promise<void> {
    const entry = await this.repo.findById(entryId);
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.userId !== userId) throw new ForbiddenException('Not your entry');
    if (
      entry.status !== WaitlistStatusEnum.WAITING &&
      entry.status !== WaitlistStatusEnum.NOTIFIED
    ) {
      throw new ConflictException(
        `Cannot leave a waitlist entry with status ${entry.status}`,
      );
    }
    await this.repo.update(entryId, { status: WaitlistStatusEnum.EXPIRED });
  }

  async listMine(userId: string): Promise<WaitlistEntry[]> {
    const entries = await this.repo.findByUser(userId);
    return entries.map(WaitlistEntryMapper.toDomain);
  }

  /**
   * Notify the next `qty` WAITING entries for a ticket type (called after
   * a booking is cancelled and inventory is restored).
   */
  async notifyNext(ticketTypeId: string, qty: number): Promise<void> {
    const entries = await this.repo.findWaiting(ticketTypeId, qty);
    if (!entries.length) return;

    const userIds = entries.map((e) => Number(e.userId));
    const users = await this.dataSource
      .getRepository(UserEntity)
      .findByIds(userIds);
    const userMap = new Map(users.map((u) => [String(u.id), u]));

    const ticketType = await this.dataSource
      .getRepository(TicketTypeEntity)
      .findOne({ where: { id: ticketTypeId }, loadEagerRelations: false });

    for (const entry of entries) {
      const expiresAt = new Date(
        Date.now() + WAITLIST_NOTIFY_HOURS * 60 * 60 * 1000,
      );
      await this.repo.update(entry.id, {
        status: WaitlistStatusEnum.NOTIFIED,
        notifiedAt: new Date(),
        expiresAt,
      });

      await this.expiryQueue.add(
        'expire',
        { entryId: entry.id },
        {
          jobId: `waitlist-expire-${entry.id}`,
          delay: WAITLIST_NOTIFY_HOURS * 60 * 60 * 1000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        },
      );

      const user = userMap.get(entry.userId);
      if (user?.email) {
        await this.mailService.waitlistNotified({
          to: user.email,
          data: {
            firstName: user.firstName ?? 'there',
            ticketTypeName: ticketType?.name ?? 'ticket',
            expiresAt: expiresAt.toLocaleString(),
          },
        });
      }
    }
  }

  /**
   * Mark a NOTIFIED waitlist entry as FULFILLED when the user books.
   * No-op if no active NOTIFIED entry exists.
   */
  async fulfillIfNotified(userId: string, ticketTypeId: string): Promise<void> {
    const entry = await this.repo.findNotifiedByUserAndTicketType(
      userId,
      ticketTypeId,
    );
    if (!entry) return;
    await this.repo.update(entry.id, { status: WaitlistStatusEnum.FULFILLED });
  }

  async expireEntry(entryId: string): Promise<void> {
    const entry = await this.repo.findById(entryId);
    if (!entry || entry.status !== WaitlistStatusEnum.NOTIFIED) return;
    await this.repo.update(entryId, { status: WaitlistStatusEnum.EXPIRED });
    await this.auditLogsService.log({
      action: 'waitlist.notified_expired',
      entity: 'WaitlistEntry',
      entityId: entryId,
    });
  }
}
