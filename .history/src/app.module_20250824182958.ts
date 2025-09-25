import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MediaModule } from './media/media.module';
import { NotificationModule } from './notification/notification.module';
import { ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
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
    DatabaseModule,
    UserModule,
    CourseModule,
    AuthModule,
    CloudinaryModule,
    MediaModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
