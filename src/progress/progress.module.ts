import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserProgress } from './entities/user-progress.entity';
import { User } from '../user/entities/user.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { Course } from '../course/entities/course.entity';
import { CourseEnrollment } from '../course/entities/course-enrollment.entity';

import { ProgressService } from './services/progress.service';
import { ProgressController } from './controllers/progress.controller';

import { CommonModule } from '../common/common.module';

/**
 * Progress Module for Stellr Academy Backend
 * 
 * This module tracks user learning progress and achievements:
 * 
 * ✅ Progress Tracking:
 * - Lesson completion status
 * - Course progress percentages
 * - Learning streak tracking
 * - Time spent on content
 * 
 * 📊 Analytics:
 * - Learning analytics and insights
 * - Progress reports and summaries
 * - Performance metrics
 * - Engagement tracking
 * 
 * 🏆 Achievements:
 * - Milestone tracking
 * - Badge and achievement system
 * - Progress sharing capabilities
 * - Motivational features
 */
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      UserProgress,
      User,
      Lesson,
      Course,
      CourseEnrollment,
    ]),
  ],
  controllers: [
    ProgressController,
  ],
  providers: [
    ProgressService,
  ],
  exports: [
    ProgressService,
  ],
})
export class ProgressModule {
  constructor() {
    console.log('✅ Progress tracking module initialized - Learning analytics ready');
  }
}