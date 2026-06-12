import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRepository } from '../notification.repository';
import { NotificationRelationalRepository } from './repositories/notification.repository';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  providers: [
    {
      provide: NotificationRepository,
      useClass: NotificationRelationalRepository,
    },
  ],
  exports: [NotificationRepository],
})
export class RelationalNotificationPersistenceModule {}
