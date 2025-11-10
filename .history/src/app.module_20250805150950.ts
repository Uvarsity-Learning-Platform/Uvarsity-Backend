import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { Auth~nestController } from './g/auth~nest/auth~nest.controller';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [DatabaseModule, UserModule, CourseModule],
  controllers: [AppController, Auth~nestController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
