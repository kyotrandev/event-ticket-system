import { WaitlistEntry } from '../../../../domain/waitlist-entry';
import { WaitlistEntryEntity } from '../entities/waitlist-entry.entity';

export class WaitlistEntryMapper {
  static toDomain(entity: WaitlistEntryEntity): WaitlistEntry {
    const d = new WaitlistEntry();
    d.id = entity.id;
    d.userId = entity.userId;
    d.ticketTypeId = entity.ticketTypeId;
    d.eventId = entity.eventId;
    d.status = entity.status;
    d.notifiedAt = entity.notifiedAt;
    d.expiresAt = entity.expiresAt;
    d.createdAt = entity.createdAt;
    d.updatedAt = entity.updatedAt;
    return d;
  }
}
