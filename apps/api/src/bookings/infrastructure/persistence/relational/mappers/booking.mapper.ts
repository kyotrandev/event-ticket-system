import { Booking } from '../../../../domain/booking';
import { BookingEntity } from '../entities/booking.entity';
import { BookingItemMapper } from '../../../../../booking-items/infrastructure/persistence/relational/mappers/booking-item.mapper';

export class BookingMapper {
  static toDomain(raw: BookingEntity): Booking {
    const domainEntity = new Booking();
    domainEntity.id = raw.id;
    domainEntity.customerId = raw.customerId;
    domainEntity.status = raw.status;
    domainEntity.expiresAt = raw.expiresAt;
    domainEntity.promoCodeId = raw.promoCodeId;
    domainEntity.subtotalAmount = raw.subtotalAmount;
    domainEntity.discountAmount = raw.discountAmount;
    domainEntity.totalAmount = raw.totalAmount;
    if (raw.items) {
      domainEntity.items = raw.items.map(BookingItemMapper.toDomain);
    }
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Booking): BookingEntity {
    const persistenceEntity = new BookingEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.customerId = domainEntity.customerId;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.expiresAt = domainEntity.expiresAt;
    persistenceEntity.promoCodeId = domainEntity.promoCodeId;
    persistenceEntity.subtotalAmount = domainEntity.subtotalAmount;
    persistenceEntity.discountAmount = domainEntity.discountAmount;
    persistenceEntity.totalAmount = domainEntity.totalAmount;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
