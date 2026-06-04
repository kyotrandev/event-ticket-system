import { PromoCode } from '../../../../domain/promo-code';
import { PromoCodeEntity } from '../entities/promo-code.entity';

export class PromoCodeMapper {
  static toDomain(raw: PromoCodeEntity): PromoCode {
    const domainEntity = new PromoCode();
    domainEntity.id = raw.id;
    domainEntity.code = raw.code;
    domainEntity.discountType = raw.discountType;
    domainEntity.discountValue = raw.discountValue;
    domainEntity.maxUses = raw.maxUses;
    domainEntity.usedCount = raw.usedCount;
    domainEntity.validFrom = raw.validFrom;
    domainEntity.validTo = raw.validTo;
    domainEntity.isActive = raw.isActive;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: PromoCode): PromoCodeEntity {
    const persistenceEntity = new PromoCodeEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.code = domainEntity.code;
    persistenceEntity.discountType = domainEntity.discountType;
    persistenceEntity.discountValue = domainEntity.discountValue;
    persistenceEntity.maxUses = domainEntity.maxUses;
    persistenceEntity.usedCount = domainEntity.usedCount;
    persistenceEntity.validFrom = domainEntity.validFrom;
    persistenceEntity.validTo = domainEntity.validTo;
    persistenceEntity.isActive = domainEntity.isActive;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
