import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Booking } from '../../domain/booking';

export abstract class BookingRepository {
  abstract create(
    data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Booking>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Booking[]>;

  abstract findById(id: Booking['id']): Promise<NullableType<Booking>>;

  abstract findByIds(ids: Booking['id'][]): Promise<Booking[]>;

  abstract update(
    id: Booking['id'],
    payload: DeepPartial<Booking>,
  ): Promise<Booking | null>;

  abstract remove(id: Booking['id']): Promise<void>;
}
