import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntryEntity } from './entities/waitlist-entry.entity';
import { WaitlistEntryRelationalRepository } from './repositories/waitlist-entry.repository';

@Module({
  imports: [TypeOrmModule.forFeature([WaitlistEntryEntity])],
  providers: [WaitlistEntryRelationalRepository],
  exports: [WaitlistEntryRelationalRepository],
})
export class RelationalWaitlistPersistenceModule {}
