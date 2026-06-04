import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BookingsService, BOOKING_EXPIRY_QUEUE } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingExpiryProcessor } from './booking-expiry.processor';
import { RelationalBookingPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalBookingPersistenceModule,
    BullModule.registerQueue({ name: BOOKING_EXPIRY_QUEUE }),
    PromoCodesModule,
    AuditLogsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpiryProcessor],
  exports: [BookingsService, RelationalBookingPersistenceModule],
})
export class BookingsModule {}
