import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { BookingItem } from '../../domain/booking-item';

export abstract class BookingItemRepository {
  abstract create(
    data: Omit<BookingItem, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<BookingItem>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<BookingItem[]>;

  abstract findById(id: BookingItem['id']): Promise<NullableType<BookingItem>>;

  abstract findByIds(ids: BookingItem['id'][]): Promise<BookingItem[]>;

  abstract update(
    id: BookingItem['id'],
    payload: DeepPartial<BookingItem>,
  ): Promise<BookingItem | null>;

  abstract remove(id: BookingItem['id']): Promise<void>;
}
