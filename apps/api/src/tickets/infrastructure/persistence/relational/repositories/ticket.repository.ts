import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TicketEntity } from '../entities/ticket.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Ticket } from '../../../../domain/ticket';
import { TicketRepository } from '../../ticket.repository';
import { TicketMapper } from '../mappers/ticket.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class TicketRelationalRepository implements TicketRepository {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly ticketRepository: Repository<TicketEntity>,
  ) {}

  async create(data: Ticket): Promise<Ticket> {
    const persistenceModel = TicketMapper.toPersistence(data);
    const newEntity = await this.ticketRepository.save(
      this.ticketRepository.create(persistenceModel),
    );
    return TicketMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Ticket[]> {
    const entities = await this.ticketRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => TicketMapper.toDomain(entity));
  }

  async findById(id: Ticket['id']): Promise<NullableType<Ticket>> {
    const entity = await this.ticketRepository.findOne({
      where: { id },
    });

    return entity ? TicketMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Ticket['id'][]): Promise<Ticket[]> {
    const entities = await this.ticketRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => TicketMapper.toDomain(entity));
  }

  async update(id: Ticket['id'], payload: Partial<Ticket>): Promise<Ticket> {
    const entity = await this.ticketRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.ticketRepository.save(
      this.ticketRepository.create(
        TicketMapper.toPersistence({
          ...TicketMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return TicketMapper.toDomain(updatedEntity);
  }

  async remove(id: Ticket['id']): Promise<void> {
    await this.ticketRepository.delete(id);
  }
}
