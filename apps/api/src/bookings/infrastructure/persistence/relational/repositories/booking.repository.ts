import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Booking } from '../../../../domain/booking';
import { BookingRepository } from '../../booking.repository';
import { BookingMapper } from '../mappers/booking.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class BookingRelationalRepository implements BookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
  ) {}

  async create(data: Booking): Promise<Booking> {
    const persistenceModel = BookingMapper.toPersistence(data);
    const newEntity = await this.bookingRepository.save(
      this.bookingRepository.create(persistenceModel),
    );
    return BookingMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Booking[]> {
    const entities = await this.bookingRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => BookingMapper.toDomain(entity));
  }

  async findById(id: Booking['id']): Promise<NullableType<Booking>> {
    const entity = await this.bookingRepository.findOne({
      where: { id },
    });

    return entity ? BookingMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Booking['id'][]): Promise<Booking[]> {
    const entities = await this.bookingRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => BookingMapper.toDomain(entity));
  }

  async update(id: Booking['id'], payload: Partial<Booking>): Promise<Booking> {
    const entity = await this.bookingRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.bookingRepository.save(
      this.bookingRepository.create(
        BookingMapper.toPersistence({
          ...BookingMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return BookingMapper.toDomain(updatedEntity);
  }

  async remove(id: Booking['id']): Promise<void> {
    await this.bookingRepository.delete(id);
  }
}
