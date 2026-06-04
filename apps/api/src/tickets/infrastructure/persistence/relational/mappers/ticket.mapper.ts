import { Ticket } from '../../../../domain/ticket';
import { TicketEntity } from '../entities/ticket.entity';
import { BookingItemMapper } from '../../../../../booking-items/infrastructure/persistence/relational/mappers/booking-item.mapper';

export class TicketMapper {
  static toDomain(raw: TicketEntity): Ticket {
    const domainEntity = new Ticket();
    domainEntity.id = raw.id;
    domainEntity.bookingItemId = raw.bookingItemId;
    if (raw.bookingItem) {
      domainEntity.bookingItem = BookingItemMapper.toDomain(raw.bookingItem);
    }
    domainEntity.eventId = raw.eventId;
    domainEntity.customerId = raw.customerId;
    domainEntity.code = raw.code;
    domainEntity.qrSecret = raw.qrSecret;
    domainEntity.status = raw.status;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Ticket): TicketEntity {
    const persistenceEntity = new TicketEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.bookingItemId = domainEntity.bookingItemId;
    persistenceEntity.eventId = domainEntity.eventId;
    persistenceEntity.customerId = domainEntity.customerId;
    persistenceEntity.code = domainEntity.code;
    persistenceEntity.qrSecret = domainEntity.qrSecret;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
