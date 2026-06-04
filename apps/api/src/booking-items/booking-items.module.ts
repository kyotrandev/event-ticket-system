import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { RelationalBookingItemPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

// Booking items are created and read through the bookings aggregate;
// no standalone API surface.
@Module({
  imports: [
    // do not remove this comment
    RelationalBookingItemPersistenceModule,
  ],
  exports: [RelationalBookingItemPersistenceModule],
})
export class BookingItemsModule {}
