import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { ProgressModule } from './progress/progress.module';
import { QuizModule } from './quiz/quiz.module';
import { CertificateModule } from './certificate/certificate.module';
import { NotificationModule } from './notification/notification.module';
import { MediaModule } from './media/media.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './common/controllers/health.controller';
import { PerformanceMiddleware } from './common/middleware/performance.middleware';

/**
 * Root application module for Uvarsity Backend
 * 
 * This module orchestrates all the microservices and shared functionality:
 * 
 * 🔐 Auth Service - User registration, login, JWT tokens, OAuth integration
 * 👤 User Service - Profile management, preferences, onboarding
 * 📚 Course Service - Course catalog, lessons, categories, tags
 * ✅ Progress Service - Learning progress tracking, completion status
 * ❓ Quiz Service - Quizzes, submissions, auto-grading, results
 * 🏆 Certificate Service - Certificate generation and management
 * 🔔 Notification Service - Email and push notifications
 * 🎥 Media Service - Video hosting, PDF storage, secure access
 * 🛠️ Common Service - Shared utilities, error handling, logging
 * 💾 Database Service - PostgreSQL connection and configuration
 */
@Module({
  imports: [
    // Global configuration module - loads .env variables and makes them available app-wide
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Rate limiting module - prevents abuse and ensures API stability
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
    ]),

    // Database connection module - handles PostgreSQL connection
    DatabaseModule,

    // Core business logic modules - each represents a microservice
    AuthModule,        // 🔐 Authentication and authorization
    UserModule,        // 👤 User management and profiles
    CourseModule,      // 📚 Course and lesson content
    ProgressModule,    // ✅ Learning progress tracking
    QuizModule,        // ❓ Quiz functionality
    CertificateModule, // 🏆 Certificate generation
    NotificationModule,// 🔔 Notifications and messaging
    MediaModule,       // 🎥 Media file management
    CommonModule,      // 🛠️ Shared utilities and common functionality
  ],
  
  // Global controllers available at the app level
  controllers: [
    HealthController, // Health check endpoint for monitoring
  ],
  
  providers: [
    // Global providers will be added here as needed
  ],
})
export class AppModule implements NestModule {
  /**
   * Configure middleware
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PerformanceMiddleware)
      .forRoutes('*'); // Apply to all routes
  }

  /**
   * Application module constructor
   * Logs successful initialization of the Uvarsity Backend
   */
  constructor() {
    console.log('🏫 Uvarsity Backend modules initialized successfully');
  }
}