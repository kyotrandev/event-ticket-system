import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { TicketTypesModule } from './ticket-types/ticket-types.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import facebookConfig from './auth-facebook/config/facebook.config';
import googleConfig from './auth-google/config/google.config';
import appleConfig from './auth-apple/config/apple.config';
import redisConfig from './queue/config/redis.config';
import stripeConfig from './payments/config/stripe.config';
import ticketConfig from './tickets/config/ticket.config';
import { BullModule } from '@nestjs/bullmq';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAppleModule } from './auth-apple/auth-apple.module';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './database/mongoose-config.service';
import { DatabaseConfig } from './database/config/database-config.type';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// <database-block>
const infrastructureDatabaseModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    })
  : TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    });
// </database-block>

import { PromoCodesModule } from './promo-codes/promo-codes.module';

import { BookingsModule } from './bookings/bookings.module';

import { BookingItemsModule } from './booking-items/booking-items.module';

import { TicketsModule } from './tickets/tickets.module';

import { PaymentsModule } from './payments/payments.module';

import { AuditLogsModule } from './audit-logs/audit-logs.module';

import { CheckInModule } from './check-in/check-in.module';

import { EventStaffAssignmentsModule } from './event-staff-assignments/event-staff-assignments.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { AdminModule } from './admin/admin.module';

@Module({
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  imports: [
    AdminModule,
    CheckInModule,
    EventStaffAssignmentsModule,
    WaitlistModule,
    AuditLogsModule,
    PaymentsModule,
    TicketsModule,
    BookingItemsModule,
    BookingsModule,
    PromoCodesModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
        appleConfig,
        redisConfig,
        stripeConfig,
        ticketConfig,
      ],
      envFilePath: ['.env'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        connection: {
          host: configService.getOrThrow('redis.host', { infer: true }),
          port: configService.getOrThrow('redis.port', { infer: true }),
        },
      }),
    }),
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    UsersModule,
    EventsModule,
    TicketTypesModule,
    FilesModule,
    AuthModule,
    AuthFacebookModule,
    AuthGoogleModule,
    AuthAppleModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
  ],
})
export class AppModule {}
