import { Module } from '@nestjs/common';
import { TicketTypesController } from './ticket-types.controller';
import { TicketTypesService } from './ticket-types.service';
import { RelationalTicketTypePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [RelationalTicketTypePersistenceModule, EventsModule],
  controllers: [TicketTypesController],
  providers: [TicketTypesService],
  exports: [TicketTypesService],
})
export class TicketTypesModule {}
