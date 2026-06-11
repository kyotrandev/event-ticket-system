import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckInLogEntity } from '../entities/check-in-log.entity';
import { CheckInLog } from '../../../../domain/check-in-log';
import { CheckInLogMapper } from '../mappers/check-in-log.mapper';
import { CheckInMethodEnum } from '../../../../check-in-method.enum';

@Injectable()
export class CheckInLogRelationalRepository {
  constructor(
    @InjectRepository(CheckInLogEntity)
    private readonly repo: Repository<CheckInLogEntity>,
  ) {}

  async create(data: {
    ticketId: string;
    eventId: string;
    staffId: string;
    method: CheckInMethodEnum;
  }): Promise<CheckInLog> {
    let entity = await this.repo.findOne({ where: { ticketId: data.ticketId } });
    if (entity) {
      entity.staffId = data.staffId;
      entity.method = data.method;
      entity.scannedAt = new Date();
    } else {
      entity = this.repo.create(data);
    }
    return CheckInLogMapper.toDomain(await this.repo.save(entity));
  }

  async findByTicket(ticketId: string): Promise<CheckInLog | null> {
    const entity = await this.repo.findOne({ where: { ticketId } });
    return entity ? CheckInLogMapper.toDomain(entity) : null;
  }

  async findByEvent(eventId: string): Promise<CheckInLog[]> {
    const entities = await this.repo.find({
      where: { eventId },
      order: { scannedAt: 'DESC' },
    });
    return entities.map(CheckInLogMapper.toDomain);
  }
}
