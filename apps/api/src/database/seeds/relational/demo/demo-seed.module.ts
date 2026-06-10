import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DemoSeedService } from './demo-seed.service';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { EventEntity } from '../../../../events/infrastructure/persistence/relational/entities/event.entity';
import { TicketTypeEntity } from '../../../../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { BookingEntity } from '../../../../bookings/infrastructure/persistence/relational/entities/booking.entity';
import { BookingItemEntity } from '../../../../booking-items/infrastructure/persistence/relational/entities/booking-item.entity';
import { PaymentEntity } from '../../../../payments/infrastructure/persistence/relational/entities/payment.entity';
import { TicketEntity } from '../../../../tickets/infrastructure/persistence/relational/entities/ticket.entity';
import { CheckInLogEntity } from '../../../../check-in/infrastructure/persistence/relational/entities/check-in-log.entity';
import { PromoCodeEntity } from '../../../../promo-codes/infrastructure/persistence/relational/entities/promo-code.entity';
import { WaitlistEntryEntity } from '../../../../waitlist/infrastructure/persistence/relational/entities/waitlist-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      EventEntity,
      TicketTypeEntity,
      BookingEntity,
      BookingItemEntity,
      PaymentEntity,
      TicketEntity,
      CheckInLogEntity,
      PromoCodeEntity,
      WaitlistEntryEntity,
    ]),
  ],
  providers: [DemoSeedService],
  exports: [DemoSeedService],
})
export class DemoSeedModule {}
