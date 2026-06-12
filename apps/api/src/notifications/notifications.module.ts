import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RelationalNotificationPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { NotificationsGateway } from './notifications.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';

@Module({
  imports: [
    RelationalNotificationPersistenceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        secret: configService.get('auth.secret', { infer: true }),
        signOptions: {
          expiresIn: configService.get('auth.expires', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [
    NotificationsService,
    NotificationsGateway,
    RelationalNotificationPersistenceModule,
  ],
})
export class NotificationsModule {}
