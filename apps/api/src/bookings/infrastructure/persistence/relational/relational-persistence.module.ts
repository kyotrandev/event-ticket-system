import { Module } from '@nestjs/common';
import { BookingRepository } from '../booking.repository';
import { BookingRelationalRepository } from './repositories/booking.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from './entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity])],
  providers: [
    {
      provide: BookingRepository,
      useClass: BookingRelationalRepository,
    },
  ],
  exports: [BookingRepository],
})
export class RelationalBookingPersistenceModule {}
