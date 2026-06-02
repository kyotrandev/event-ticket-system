import { NullableType } from '../utils/types/nullable.type';
import { DeepPartial } from '../utils/types/deep-partial.type';
import { TicketType } from './domain/ticket-type';

export abstract class TicketTypeRepository {
  abstract create(
    data: Omit<TicketType, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TicketType>;

  abstract findByEvent(eventId: string): Promise<TicketType[]>;

  abstract findById(id: string): Promise<NullableType<TicketType>>;

  abstract update(
    id: string,
    payload: DeepPartial<TicketType>,
  ): Promise<TicketType>;

  abstract remove(id: string): Promise<void>;

  abstract countByEvent(eventId: string): Promise<number>;
}
