import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { PromoCodeRepository } from './infrastructure/persistence/promo-code.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { PromoCode } from './domain/promo-code';
import { PromoCodeEntity } from './infrastructure/persistence/relational/entities/promo-code.entity';
import { PromoCodeDiscountTypeEnum } from './promo-code-discount-type.enum';

@Injectable()
export class PromoCodesService {
  constructor(
    private readonly promoCodeRepository: PromoCodeRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const existing = await this.dataSource
      .getRepository(PromoCodeEntity)
      .findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('Promo code already exists');
    }
    if (dto.validFrom >= dto.validTo) {
      throw new BadRequestException('validFrom must be before validTo');
    }

    return this.promoCodeRepository.create({
      code: dto.code,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxUses: dto.maxUses,
      usedCount: 0,
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      isActive: dto.isActive ?? true,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.promoCodeRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: PromoCode['id']) {
    return this.promoCodeRepository.findById(id);
  }

  async update(id: PromoCode['id'], dto: UpdatePromoCodeDto) {
    return this.promoCodeRepository.update(id, dto);
  }

  // Soft delete per SPEC US-6.3: deactivate, never hard-delete.
  async remove(id: PromoCode['id']) {
    await this.promoCodeRepository.update(id, { isActive: false });
  }

  /**
   * Validates a promo code for use against a subtotal. Throws the
   * SPEC-mandated errors; returns the entity + computed discount.
   * Pass a transaction manager to evaluate inside a booking transaction.
   */
  async validateForUse(
    code: string,
    subtotalAmount: number,
    manager?: EntityManager,
  ): Promise<{ promoCode: PromoCodeEntity; discountAmount: number }> {
    const repo = (manager ?? this.dataSource.manager).getRepository(
      PromoCodeEntity,
    );
    const promoCode = await repo.findOne({ where: { code } });

    const now = new Date();
    if (
      !promoCode ||
      !promoCode.isActive ||
      promoCode.validFrom > now ||
      promoCode.validTo < now
    ) {
      throw new BadRequestException('Invalid or expired promo code');
    }
    if (promoCode.usedCount >= promoCode.maxUses) {
      throw new BadRequestException('Promo code has reached its usage limit');
    }

    return {
      promoCode,
      discountAmount: this.computeDiscount(promoCode, subtotalAmount),
    };
  }

  computeDiscount(
    promoCode: Pick<PromoCodeEntity, 'discountType' | 'discountValue'>,
    subtotalAmount: number,
  ): number {
    if (promoCode.discountType === PromoCodeDiscountTypeEnum.PERCENT) {
      return Math.floor((subtotalAmount * promoCode.discountValue) / 100);
    }
    return Math.min(promoCode.discountValue, subtotalAmount);
  }

  /**
   * Atomically consumes one use. Conditional UPDATE guarantees usedCount
   * never overshoots maxUses under concurrency. Returns false when the
   * limit was already reached.
   *
   * Timing decision: usage is consumed at PAYMENT SUCCESS, not at booking
   * creation — expired/failed bookings never burn promo uses.
   */
  async consumeUse(id: string, manager?: EntityManager): Promise<boolean> {
    const result = await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(PromoCodeEntity)
      .set({ usedCount: () => '"usedCount" + 1' })
      .where('id = :id AND "usedCount" < "maxUses"', { id })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
