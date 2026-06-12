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
import { MailModule } from '../mail/mail.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalBookingPersistenceModule,
    BullModule.registerQueue({ name: BOOKING_EXPIRY_QUEUE }),
    PromoCodesModule,
    AuditLogsModule,
    MailModule,
    WaitlistModule,
    NotificationsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpiryProcessor],
  exports: [BookingsService, RelationalBookingPersistenceModule],
})
export class BookingsModule {}
