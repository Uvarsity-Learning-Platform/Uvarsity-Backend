import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserPrismaService } from './services/user-prisma.service';
import { User } from './entities/user.entity';
import { CommonModule } from '../common/common.module';

/**
 * User Module for Uvarsity Backend
 * 
 * This module handles all user-related functionality including:
 * 
 * 👤 Profile Management:
 * - User profile viewing and editing
 * - Avatar/photo upload and management
 * - Personal information updates
 * - Account preferences configuration
 * 
 * 🚀 Onboarding:
 * - New user onboarding flow
 * - Tutorial completion tracking
 * - Initial preferences setup
 * - Welcome process management
 * 
 * ⚙️ Preferences & Settings:
 * - Notification preferences (email, SMS, push)
 * - Language and timezone settings
 * - Learning preferences and goals
 * - Privacy and security settings
 * 
 * 📊 Account Management:
 * - Account status management
 * - Soft delete for GDPR compliance
 * - Activity tracking and analytics
 * - Account recovery and restoration
 * 
 * 🔗 Integration Points:
 * - Links with authentication for user data
 * - Connects to progress tracking
 * - Integrates with notification preferences
 * - Supports certificate generation with user info
 */
@Module({
  imports: [
    // Common utilities and error handling
    CommonModule,
    
    // TypeORM entity registration
    TypeOrmModule.forFeature([User]),
  ],
  
  controllers: [
    UserController, // HTTP endpoints for user operations
  ],
  
  providers: [
    UserService, // Business logic for user management (TypeORM)
    UserPrismaService, // Business logic for user management (Prisma)
  ],
  
  exports: [
    UserService, // Export for use in other modules (auth, progress, etc.)
    UserPrismaService, // Export Prisma service for gradual migration
    TypeOrmModule, // Export TypeORM for User entity access
  ],
})
export class UserModule {
  /**
   * User module constructor
   * Logs successful initialization of user services
   */
  constructor() {
    console.log('👤 User management module initialized - Profile, preferences, and onboarding ready (TypeORM + Prisma)');
  }
}