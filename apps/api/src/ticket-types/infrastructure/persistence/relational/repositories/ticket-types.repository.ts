import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketTypeEntity } from '../entities/ticket-type.entity';
import { TicketType } from '../../../../domain/ticket-type';
import { TicketTypeRepository } from '../../../../ticket-types.repository';
import { TicketTypeMapper } from '../mappers/ticket-type.mapper';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';

@Injectable()
export class TicketTypesRelationalRepository implements TicketTypeRepository {
  constructor(
    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypesRepository: Repository<TicketTypeEntity>,
  ) {}

  async create(
    data: Omit<TicketType, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TicketType> {
    const entity = this.ticketTypesRepository.create(data as TicketTypeEntity);
    const saved = await this.ticketTypesRepository.save(entity);
    return TicketTypeMapper.toDomain(saved);
  }

  async findByEvent(eventId: string): Promise<TicketType[]> {
    const entities = await this.ticketTypesRepository.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(TicketTypeMapper.toDomain);
  }

  async findById(id: string): Promise<NullableType<TicketType>> {
    const entity = await this.ticketTypesRepository.findOne({ where: { id } });
    return entity ? TicketTypeMapper.toDomain(entity) : null;
  }

  async update(
    id: string,
    payload: DeepPartial<TicketType>,
  ): Promise<TicketType> {
    const entity = await this.ticketTypesRepository.findOne({ where: { id } });
    if (!entity) {
      throw new Error('TicketType not found');
    }
    const merged = this.ticketTypesRepository.merge(entity, payload as any);
    const saved = await this.ticketTypesRepository.save(merged);
    return TicketTypeMapper.toDomain(saved);
  }

  async remove(id: string): Promise<void> {
    await this.ticketTypesRepository.delete({ id });
  }

  async countByEvent(eventId: string): Promise<number> {
    return this.ticketTypesRepository.count({ where: { eventId } });
  }
}
