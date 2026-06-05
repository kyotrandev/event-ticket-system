import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WaitlistService, WAITLIST_EXPIRY_QUEUE } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { WaitlistExpiryProcessor } from './waitlist-expiry.processor';
import { RelationalWaitlistPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { MailModule } from '../mail/mail.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    RelationalWaitlistPersistenceModule,
    BullModule.registerQueue({ name: WAITLIST_EXPIRY_QUEUE }),
    MailModule,
    AuditLogsModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistExpiryProcessor],
  exports: [WaitlistService],
})
export class WaitlistModule {}
