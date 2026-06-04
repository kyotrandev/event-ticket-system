import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BookingItemEntity } from '../entities/booking-item.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { BookingItem } from '../../../../domain/booking-item';
import { BookingItemRepository } from '../../booking-item.repository';
import { BookingItemMapper } from '../mappers/booking-item.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class BookingItemRelationalRepository implements BookingItemRepository {
  constructor(
    @InjectRepository(BookingItemEntity)
    private readonly bookingItemRepository: Repository<BookingItemEntity>,
  ) {}

  async create(data: BookingItem): Promise<BookingItem> {
    const persistenceModel = BookingItemMapper.toPersistence(data);
    const newEntity = await this.bookingItemRepository.save(
      this.bookingItemRepository.create(persistenceModel),
    );
    return BookingItemMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<BookingItem[]> {
    const entities = await this.bookingItemRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => BookingItemMapper.toDomain(entity));
  }

  async findById(id: BookingItem['id']): Promise<NullableType<BookingItem>> {
    const entity = await this.bookingItemRepository.findOne({
      where: { id },
    });

    return entity ? BookingItemMapper.toDomain(entity) : null;
  }

  async findByIds(ids: BookingItem['id'][]): Promise<BookingItem[]> {
    const entities = await this.bookingItemRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => BookingItemMapper.toDomain(entity));
  }

  async update(
    id: BookingItem['id'],
    payload: Partial<BookingItem>,
  ): Promise<BookingItem> {
    const entity = await this.bookingItemRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.bookingItemRepository.save(
      this.bookingItemRepository.create(
        BookingItemMapper.toPersistence({
          ...BookingItemMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return BookingItemMapper.toDomain(updatedEntity);
  }

  async remove(id: BookingItem['id']): Promise<void> {
    await this.bookingItemRepository.delete(id);
  }
}
