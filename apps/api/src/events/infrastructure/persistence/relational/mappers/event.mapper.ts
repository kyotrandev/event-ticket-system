import { Event } from '../../../../domain/event';
import { EventEntity } from '../entities/event.entity';

export class EventMapper {
  static toDomain(raw: EventEntity): Event {
    const domainEntity = new Event();
    domainEntity.id = raw.id;
    domainEntity.organizerId = raw.organizerId;
    domainEntity.name = raw.name;
    domainEntity.description = raw.description;
    domainEntity.location = raw.location;
    domainEntity.category = raw.category;
    domainEntity.tags = raw.tags;
    domainEntity.startTime = raw.startTime;
    domainEntity.endTime = raw.endTime;
    domainEntity.bannerUrl = raw.bannerUrl;
    domainEntity.cancellationWindowHours = raw.cancellationWindowHours;
    domainEntity.maxTicketsPerOrder = raw.maxTicketsPerOrder;
    domainEntity.status = raw.status;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt ?? null;
    return domainEntity;
  }

  static toPersistence(domainEntity: Event): EventEntity {
    const persistenceEntity = new EventEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.organizerId = domainEntity.organizerId;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.description = domainEntity.description;
    persistenceEntity.location = domainEntity.location;
    persistenceEntity.category = domainEntity.category;
    persistenceEntity.tags = domainEntity.tags;
    persistenceEntity.startTime = domainEntity.startTime;
    persistenceEntity.endTime = domainEntity.endTime;
    persistenceEntity.bannerUrl = domainEntity.bannerUrl;
    persistenceEntity.cancellationWindowHours = domainEntity.cancellationWindowHours;
    persistenceEntity.maxTicketsPerOrder = domainEntity.maxTicketsPerOrder;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt ?? null;
    return persistenceEntity;
  }
}
