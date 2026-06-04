import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { PromoCode } from '../../domain/promo-code';

export abstract class PromoCodeRepository {
  abstract create(
    data: Omit<PromoCode, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PromoCode>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<PromoCode[]>;

  abstract findById(id: PromoCode['id']): Promise<NullableType<PromoCode>>;

  abstract findByIds(ids: PromoCode['id'][]): Promise<PromoCode[]>;

  abstract update(
    id: PromoCode['id'],
    payload: DeepPartial<PromoCode>,
  ): Promise<PromoCode | null>;

  abstract remove(id: PromoCode['id']): Promise<void>;
}
