import { AuditLog } from '../../../../domain/audit-log';
import { AuditLogEntity } from '../entities/audit-log.entity';

export class AuditLogMapper {
  static toDomain(raw: AuditLogEntity): AuditLog {
    const domainEntity = new AuditLog();
    domainEntity.id = raw.id;
    domainEntity.userId = raw.userId;
    domainEntity.action = raw.action;
    domainEntity.entity = raw.entity;
    domainEntity.entityId = raw.entityId;
    domainEntity.payload = raw.payload;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: AuditLog): AuditLogEntity {
    const persistenceEntity = new AuditLogEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.userId = domainEntity.userId;
    persistenceEntity.action = domainEntity.action;
    persistenceEntity.entity = domainEntity.entity;
    persistenceEntity.entityId = domainEntity.entityId;
    persistenceEntity.payload = domainEntity.payload;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
