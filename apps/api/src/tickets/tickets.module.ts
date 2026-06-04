import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { RelationalTicketPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalTicketPersistenceModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService, RelationalTicketPersistenceModule],
})
export class TicketsModule {}
