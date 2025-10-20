import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { DatabaseModule } from '../database/database.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [DatabaseModule, MediaModule],
  controllers: [CourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
