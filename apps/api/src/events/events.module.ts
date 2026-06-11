import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { RelationalEventPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { EventStaffAssignmentsModule } from '../event-staff-assignments/event-staff-assignments.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BookingsModule } from '../bookings/bookings.module';
import { TicketsModule } from '../tickets/tickets.module';
import { RelationalTicketTypePersistenceModule } from '../ticket-types/infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    RelationalEventPersistenceModule,
    RelationalTicketTypePersistenceModule,
    EventStaffAssignmentsModule,
    AnalyticsModule,
    BookingsModule,
    TicketsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService, RelationalEventPersistenceModule],
})
export class EventsModule {}
