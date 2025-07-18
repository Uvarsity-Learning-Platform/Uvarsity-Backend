import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from './entities/course.entity';
import { Lesson } from './entities/lesson.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { User } from '../user/entities/user.entity';

import { CourseService } from './services/course.service';
import { LessonService } from './services/lesson.service';

import { CourseController } from './controllers/course.controller';
import { LessonController } from './controllers/lesson.controller';

import { CommonModule } from '../common/common.module';

/**
 * Course Module for Uvarsity Backend
 * 
 * This module handles course catalog and lesson content management:
 * 
 * 📚 Course Management:
 * - Course catalog with categories and tags
 * - Lesson content and structure
 * - Course metadata and descriptions
 * - Learning paths and prerequisites
 * 
 * 🎯 Content Organization:
 * - Hierarchical course structure
 * - Lesson ordering and dependencies
 * - Content categorization and tagging
 * - Search and filtering capabilities
 * 
 * 📖 Content Delivery:
 * - Course enrollment management
 * - Lesson access control
 * - Progress tracking integration
 * - Media content linking
 */
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Course,
      Lesson,
      CourseEnrollment,
      User,
    ]),
  ],
  controllers: [
    CourseController,
    LessonController,
  ],
  providers: [
    CourseService,
    LessonService,
  ],
  exports: [
    CourseService,
    LessonService,
  ],
})
export class CourseModule {
  constructor() {
    console.log('📚 Course module initialized - Catalog and content management ready');
  }
}