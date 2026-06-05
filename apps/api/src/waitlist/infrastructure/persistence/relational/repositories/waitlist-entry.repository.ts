import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntryEntity } from '../entities/waitlist-entry.entity';
import { WaitlistStatusEnum } from '../../../../waitlist-status.enum';

@Injectable()
export class WaitlistEntryRelationalRepository {
  constructor(
    @InjectRepository(WaitlistEntryEntity)
    private readonly repo: Repository<WaitlistEntryEntity>,
  ) {}

  create(data: {
    userId: string;
    ticketTypeId: string;
    eventId: string;
  }): Promise<WaitlistEntryEntity> {
    return this.repo.save(
      this.repo.create({ ...data, status: WaitlistStatusEnum.WAITING }),
    );
  }

  findById(id: string): Promise<WaitlistEntryEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByUser(userId: string): Promise<WaitlistEntryEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findActiveByUserAndTicketType(
    userId: string,
    ticketTypeId: string,
  ): Promise<WaitlistEntryEntity | null> {
    return this.repo
      .createQueryBuilder('we')
      .where('we.userId = :userId AND we.ticketTypeId = :ticketTypeId', {
        userId,
        ticketTypeId,
      })
      .andWhere('we.status IN (:...statuses)', {
        statuses: [WaitlistStatusEnum.WAITING, WaitlistStatusEnum.NOTIFIED],
      })
      .getOne();
  }

  findNotifiedByUserAndTicketType(
    userId: string,
    ticketTypeId: string,
  ): Promise<WaitlistEntryEntity | null> {
    return this.repo.findOne({
      where: { userId, ticketTypeId, status: WaitlistStatusEnum.NOTIFIED },
    });
  }

  findWaiting(ticketTypeId: string, limit: number): Promise<WaitlistEntryEntity[]> {
    return this.repo.find({
      where: { ticketTypeId, status: WaitlistStatusEnum.WAITING },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  update(
    id: string,
    data: Partial<
      Pick<WaitlistEntryEntity, 'status' | 'notifiedAt' | 'expiresAt'>
    >,
  ): Promise<void> {
    return this.repo.update(id, data).then(() => undefined);
  }
}
