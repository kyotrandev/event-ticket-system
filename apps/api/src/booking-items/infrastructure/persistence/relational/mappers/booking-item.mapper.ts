import { BookingItem } from '../../../../domain/booking-item';
import { BookingItemEntity } from '../entities/booking-item.entity';
import { TicketTypeMapper } from '../../../../../ticket-types/infrastructure/persistence/relational/mappers/ticket-type.mapper';

export class BookingItemMapper {
  static toDomain(raw: BookingItemEntity): BookingItem {
    const domainEntity = new BookingItem();
    domainEntity.id = raw.id;
    domainEntity.bookingId = raw.bookingId;
    domainEntity.ticketTypeId = raw.ticketTypeId;
    if (raw.ticketType) {
      domainEntity.ticketType = TicketTypeMapper.toDomain(raw.ticketType);
    }
    domainEntity.quantity = raw.quantity;
    domainEntity.unitPrice = raw.unitPrice;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: BookingItem): BookingItemEntity {
    const persistenceEntity = new BookingItemEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.bookingId = domainEntity.bookingId;
    persistenceEntity.ticketTypeId = domainEntity.ticketTypeId;
    persistenceEntity.quantity = domainEntity.quantity;
    persistenceEntity.unitPrice = domainEntity.unitPrice;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
