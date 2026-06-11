import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { EventEntity } from '../entities/event.entity';
import { TicketTypeEntity } from '../../../../../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { Event } from '../../../../domain/event';
import {
  EventRepository,
  FindPublishedOptions,
} from '../../../../events.repository';
import { EventMapper } from '../mappers/event.mapper';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';
import { EventStatusEnum } from '../../../../event-status.enum';

@Injectable()
export class EventsRelationalRepository implements EventRepository {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypesRepository: Repository<TicketTypeEntity>,
  ) {}

  async create(
    data: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Event> {
    const entity = this.eventsRepository.create(data as EventEntity);
    const saved = await this.eventsRepository.save(entity);
    return EventMapper.toDomain(saved);
  }

  async findPublished(options: FindPublishedOptions): Promise<Event[]> {
    const where: FindOptionsWhere<EventEntity>[] = [];

    const baseWhere: FindOptionsWhere<EventEntity> = {
      status: undefined,
    };

    const statuses = options.status
      ? [options.status as EventStatusEnum]
      : [EventStatusEnum.PUBLISHED, EventStatusEnum.ONGOING];

    statuses.forEach((status) => {
      const statusWhere: FindOptionsWhere<EventEntity> = {
        ...baseWhere,
        status,
      };

      if (options.category) {
        statusWhere.category = ILike(`%${options.category}%`) as any;
      }
      if (options.location) {
        statusWhere.location = ILike(`%${options.location}%`) as any;
      }
      if (options.dateFrom) {
        statusWhere.startTime = MoreThanOrEqual(
          new Date(options.dateFrom),
        ) as any;
      }
      if (options.dateTo) {
        statusWhere.endTime = LessThanOrEqual(new Date(options.dateTo)) as any;
      }

      where.push(statusWhere);
    });

    let entities: EventEntity[];

    if (options.keyword) {
      const keyword = options.keyword;
      const qb = this.eventsRepository
        .createQueryBuilder('event')
        .where('event.status IN (:...statuses)', {
          statuses,
        })
        .andWhere('(event.name ILIKE :kw OR event.description ILIKE :kw)', {
          kw: `%${keyword}%`,
        });

      if (options.category) {
        qb.andWhere('event.category ILIKE :category', {
          category: `%${options.category}%`,
        });
      }
      if (options.location) {
        qb.andWhere('event.location ILIKE :location', {
          location: `%${options.location}%`,
        });
      }
      if (options.dateFrom) {
        qb.andWhere('event.startTime >= :dateFrom', {
          dateFrom: new Date(options.dateFrom),
        });
      }
      if (options.dateTo) {
        qb.andWhere('event.endTime <= :dateTo', {
          dateTo: new Date(options.dateTo),
        });
      }

      qb.orderBy('event.startTime', 'ASC')
        .skip((options.page - 1) * options.limit)
        .take(options.limit);

      entities = await qb.getMany();
    } else {
      entities = await this.eventsRepository.find({
        where,
        order: { startTime: 'ASC' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      });
    }

    return entities.map(EventMapper.toDomain);
  }

  async findByOrganizer(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<Event[]> {
    const entities = await this.eventsRepository.find({
      where: { organizerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: false,
    });
    return entities.map(EventMapper.toDomain);
  }

  async findById(id: string): Promise<NullableType<Event>> {
    const entity = await this.eventsRepository.findOne({ where: { id } });
    return entity ? EventMapper.toDomain(entity) : null;
  }

  async update(id: string, payload: DeepPartial<Event>): Promise<Event> {
    const entity = await this.eventsRepository.findOne({ where: { id } });
    if (!entity) {
      throw new Error('Event not found');
    }
    const merged = this.eventsRepository.merge(entity, payload as any);
    const saved = await this.eventsRepository.save(merged);
    return EventMapper.toDomain(saved);
  }

  async updateStatus(id: string, status: EventStatusEnum): Promise<Event> {
    await this.eventsRepository.update({ id }, { status });
    const entity = await this.eventsRepository.findOne({ where: { id } });
    if (!entity) {
      throw new Error('Event not found');
    }
    return EventMapper.toDomain(entity);
  }

  async remove(id: string): Promise<void> {
    await this.eventsRepository.softDelete({ id });
  }

  async countTicketTypesByEvent(eventId: string): Promise<number> {
    return this.ticketTypesRepository.count({ where: { eventId } });
  }
}
