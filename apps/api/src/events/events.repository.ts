import { NullableType } from '../utils/types/nullable.type';
import { DeepPartial } from '../utils/types/deep-partial.type';
import { Event } from './domain/event';
import { EventStatusEnum } from './event-status.enum';

export interface FindPublishedOptions {
  keyword?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  page: number;
  limit: number;
}

export abstract class EventRepository {
  abstract create(
    data: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Event>;

  abstract findPublished(options: FindPublishedOptions): Promise<Event[]>;

  abstract findByOrganizer(
    organizerId: string,
    page: number,
    limit: number,
  ): Promise<Event[]>;

  abstract findById(id: string): Promise<NullableType<Event>>;

  abstract update(id: string, payload: DeepPartial<Event>): Promise<Event>;

  abstract remove(id: string): Promise<void>;

  abstract countTicketTypesByEvent(eventId: string): Promise<number>;

  abstract updateStatus(id: string, status: EventStatusEnum): Promise<Event>;
}
