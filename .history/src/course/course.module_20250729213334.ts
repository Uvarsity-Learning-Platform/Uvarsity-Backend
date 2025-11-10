import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';

@Module({
  imports: [data]
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
