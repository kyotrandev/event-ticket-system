import { Notification } from '../../../../domain/notification';
import { NotificationEntity } from '../entities/notification.entity';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

export class NotificationMapper {
  static toDomain(raw: NotificationEntity): Notification {
    const domainEntity = new Notification();
    domainEntity.id = raw.id;
    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }
    domainEntity.title = raw.title;
    domainEntity.content = raw.content;
    domainEntity.type = raw.type;
    domainEntity.isRead = raw.isRead;
    domainEntity.relatedEntityId = raw.relatedEntityId;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Notification): NotificationEntity {
    const persistenceEntity = new NotificationEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    if (domainEntity.user) {
      persistenceEntity.user = UserMapper.toPersistence(domainEntity.user);
    }
    persistenceEntity.title = domainEntity.title;
    persistenceEntity.content = domainEntity.content;
    persistenceEntity.type = domainEntity.type;
    persistenceEntity.isRead = domainEntity.isRead;
    persistenceEntity.relatedEntityId = domainEntity.relatedEntityId;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
