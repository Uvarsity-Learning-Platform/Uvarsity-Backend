import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Course } from '../course/entities/course.entity';
import { CourseEnrollment } from '../course/entities/course-enrollment.entity';
import { Lesson } from '../course/entities/lesson.entity';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

// Controllers
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminCourseController } from './controllers/admin-course.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';

// Services
import { AdminUserService } from './services/admin-user.service';
import { AdminCourseService } from './services/admin-course.service';
import { AdminDashboardService } from './services/admin-dashboard.service';

// Guards
import { AdminGuard } from './guards/admin.guard';
import { InstructorGuard } from './guards/instructor.guard';

/**
 * Admin Module
 * 
 * Provides comprehensive admin panel functionality for the Uvarsity platform:
 * 
 * 👤 User Management:
 * - View, create, update, and delete users
 * - Manage user roles and permissions
 * - Bulk user operations
 * - User analytics and reporting
 * 
 * 📚 Course Management:
 * - Course creation and content management
 * - Course publishing and archiving
 * - Bulk course operations
 * - Course analytics and statistics
 * 
 * 📊 Dashboard & Analytics:
 * - Platform-wide statistics
 * - User engagement metrics
 * - Course performance analytics
 * - System health monitoring
 * 
 * 🔒 Security:
 * - Role-based access control
 * - Admin and instructor guards
 * - Protected admin routes
 * - Audit logging
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      CourseEnrollment,
      Lesson,
    ]),
    AuthModule,
    CommonModule,
  ],
  controllers: [
    AdminUserController,
    AdminCourseController,
    AdminDashboardController,
  ],
  providers: [
    AdminUserService,
    AdminCourseService,
    AdminDashboardService,
    AdminGuard,
    InstructorGuard,
  ],
  exports: [
    AdminUserService,
    AdminCourseService,
    AdminDashboardService,
    AdminGuard,
    InstructorGuard,
  ],
})
export class AdminModule {
  constructor() {
    console.log('🔧 Admin module initialized - Full admin panel functionality available');
  }
}