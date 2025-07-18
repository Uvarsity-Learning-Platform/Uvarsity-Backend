import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { User } from '../user/entities/user.entity';
import { Lesson } from '../course/entities/lesson.entity';

import { QuizService } from './services/quiz.service';
import { QuizController } from './controllers/quiz.controller';

import { CommonModule } from '../common/common.module';

/**
 * Quiz Module for Uvarsity Backend
 * 
 * This module handles quiz functionality and assessments:
 * 
 * ❓ Quiz Management:
 * - Quiz creation and configuration
 * - Question bank management
 * - Multiple question types support
 * - Quiz scheduling and availability
 * 
 * 📝 Assessment:
 * - Quiz submission handling
 * - Automatic grading system
 * - Score calculation and feedback
 * - Attempt tracking and limits
 * 
 * 📊 Results & Analytics:
 * - Quiz results and statistics
 * - Performance analytics
 * - Progress integration
 * - Certificate eligibility tracking
 */
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Quiz,
      Question,
      QuizAttempt,
      User,
      Lesson,
    ]),
  ],
  controllers: [
    QuizController,
  ],
  providers: [
    QuizService,
  ],
  exports: [
    QuizService,
  ],
})
export class QuizModule {
  constructor() {
    console.log('❓ Quiz module initialized - Assessments and grading ready');
  }
}