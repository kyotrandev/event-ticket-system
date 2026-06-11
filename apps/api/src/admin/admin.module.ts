import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { UsersModule } from '../users/users.module';
import { BookingsModule } from '../bookings/bookings.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    AnalyticsModule,
    UsersModule,
    BookingsModule,
    TicketsModule,
    AuditLogsModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
