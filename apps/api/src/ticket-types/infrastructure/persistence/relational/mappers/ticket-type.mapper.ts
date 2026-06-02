import { TicketType } from '../../../../domain/ticket-type';
import { TicketTypeEntity } from '../entities/ticket-type.entity';

export class TicketTypeMapper {
  static toDomain(raw: TicketTypeEntity): TicketType {
    const domainEntity = new TicketType();
    domainEntity.id = raw.id;
    domainEntity.eventId = raw.eventId;
    domainEntity.name = raw.name;
    domainEntity.price = raw.price;
    domainEntity.totalQty = raw.totalQty;
    domainEntity.soldQty = raw.soldQty;
    domainEntity.reservedQty = raw.reservedQty;
    domainEntity.saleStart = raw.saleStart;
    domainEntity.saleEnd = raw.saleEnd;
    domainEntity.status = raw.status;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: TicketType): TicketTypeEntity {
    const persistenceEntity = new TicketTypeEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.eventId = domainEntity.eventId;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.price = domainEntity.price;
    persistenceEntity.totalQty = domainEntity.totalQty;
    persistenceEntity.soldQty = domainEntity.soldQty;
    persistenceEntity.reservedQty = domainEntity.reservedQty;
    persistenceEntity.saleStart = domainEntity.saleStart;
    persistenceEntity.saleEnd = domainEntity.saleEnd;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    return persistenceEntity;
  }
}
