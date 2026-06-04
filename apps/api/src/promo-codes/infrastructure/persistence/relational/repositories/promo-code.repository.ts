import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PromoCodeEntity } from '../entities/promo-code.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { PromoCode } from '../../../../domain/promo-code';
import { PromoCodeRepository } from '../../promo-code.repository';
import { PromoCodeMapper } from '../mappers/promo-code.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PromoCodeRelationalRepository implements PromoCodeRepository {
  constructor(
    @InjectRepository(PromoCodeEntity)
    private readonly promoCodeRepository: Repository<PromoCodeEntity>,
  ) {}

  async create(data: PromoCode): Promise<PromoCode> {
    const persistenceModel = PromoCodeMapper.toPersistence(data);
    const newEntity = await this.promoCodeRepository.save(
      this.promoCodeRepository.create(persistenceModel),
    );
    return PromoCodeMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<PromoCode[]> {
    const entities = await this.promoCodeRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => PromoCodeMapper.toDomain(entity));
  }

  async findById(id: PromoCode['id']): Promise<NullableType<PromoCode>> {
    const entity = await this.promoCodeRepository.findOne({
      where: { id },
    });

    return entity ? PromoCodeMapper.toDomain(entity) : null;
  }

  async findByIds(ids: PromoCode['id'][]): Promise<PromoCode[]> {
    const entities = await this.promoCodeRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => PromoCodeMapper.toDomain(entity));
  }

  async update(
    id: PromoCode['id'],
    payload: Partial<PromoCode>,
  ): Promise<PromoCode> {
    const entity = await this.promoCodeRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.promoCodeRepository.save(
      this.promoCodeRepository.create(
        PromoCodeMapper.toPersistence({
          ...PromoCodeMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return PromoCodeMapper.toDomain(updatedEntity);
  }

  async remove(id: PromoCode['id']): Promise<void> {
    await this.promoCodeRepository.delete(id);
  }
}
