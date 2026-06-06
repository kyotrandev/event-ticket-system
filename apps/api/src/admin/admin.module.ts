import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AnalyticsModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
