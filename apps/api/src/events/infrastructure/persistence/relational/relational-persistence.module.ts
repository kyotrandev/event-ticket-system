import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventRepository } from '../../../events.repository';
import { EventsRelationalRepository } from './repositories/events.repository';
import { TicketTypeEntity } from '../../../../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity, TicketTypeEntity])],
  providers: [
    {
      provide: EventRepository,
      useClass: EventsRelationalRepository,
    },
  ],
  exports: [EventRepository],
})
export class RelationalEventPersistenceModule {}
