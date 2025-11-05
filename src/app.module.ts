import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsModule } from './payments/payments.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MediaModule } from './media/media.module';
import { NotificationModule } from './notification/notification.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import {
  configValidationSchema,
  databaseConfig,
  jwtConfig,
  serverConfig,
  cloudinaryConfig,
  redisConfig,
  emailConfig,
  securityConfig,
  uploadConfig,
} from './config/configuration';
import { PaystackService } from './payments/paystack.service';
import { PaystackController } from './payments/paystack.controller';

@Module({
  imports: [
    PaymentsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      load: [
        databaseConfig,
        jwtConfig,
        serverConfig,
        cloudinaryConfig,
        redisConfig,
        emailConfig,
        securityConfig,
        uploadConfig,
      ],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('security.rateLimitTtl') || 60000,
            limit: configService.get<number>('security.rateLimitLimit') || 100,
          },
        ],
      }),
    }),
    DatabaseModule,
    UserModule,
    CourseModule,
    AuthModule,
    CloudinaryModule,
    MediaModule,
    NotificationModule,
  ],
  controllers: [AppController, PaystackController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    PaystackService,
  ],
})
export class AppModule {}
