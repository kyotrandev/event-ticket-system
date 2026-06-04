import { Module } from '@nestjs/common';
import { BookingItemRepository } from '../booking-item.repository';
import { BookingItemRelationalRepository } from './repositories/booking-item.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingItemEntity } from './entities/booking-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookingItemEntity])],
  providers: [
    {
      provide: BookingItemRepository,
      useClass: BookingItemRelationalRepository,
    },
  ],
  exports: [BookingItemRepository],
})
export class RelationalBookingItemPersistenceModule {}
