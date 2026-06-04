import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsService, TICKET_DELIVERY_QUEUE } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TicketDeliveryProcessor } from './ticket-delivery.processor';
import { RelationalPaymentPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { BookingsModule } from '../bookings/bookings.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalPaymentPersistenceModule,
    BullModule.registerQueue({ name: TICKET_DELIVERY_QUEUE }),
    BookingsModule,
    TicketsModule,
    PromoCodesModule,
    AuditLogsModule,
    MailModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, TicketDeliveryProcessor],
  exports: [PaymentsService, RelationalPaymentPersistenceModule],
})
export class PaymentsModule {}
