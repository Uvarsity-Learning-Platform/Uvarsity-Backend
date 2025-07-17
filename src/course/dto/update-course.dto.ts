import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';
import { CreateLessonDto } from './create-lesson.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}