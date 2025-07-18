import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoggerService } from '../../common/services/logger.service';

/**
 * User Service for Uvarsity Backend
 * 
 * This service handles all user-related business logic including:
 * - User profile management and updates
 * - User preferences and settings
 * - Onboarding flow management
 * - Account status and activity tracking
 * 
 * The service integrates with other modules for:
 * - Authentication (user lookup and validation)
 * - Progress tracking (user-specific data)
 * - Notifications (user preferences)
 * - Certificates (user information for generation)
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Find a user by their unique ID
   * 
   * @param id - User ID to search for
   * @returns User entity or null if not found
   */
  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      this.logger.debug(`User lookup by ID: ${id} - ${user ? 'Found' : 'Not found'}`, 'UserService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user by ID: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Find a user by their email address
   * 
   * @param email - Email address to search for
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      this.logger.debug(`User lookup by email: ${email} - ${user ? 'Found' : 'Not found'}`, 'UserService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user by email: ${email}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Create a new user account
   * 
   * @param userData - User registration data
   * @returns Created user entity
   */
  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const user = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(user);
      
      this.logger.log(`New user created: ${savedUser.email}`, 'UserService');
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to create user: ${userData.email}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Update user profile information
   * 
   * @param id - User ID to update
   * @param updateData - Data to update
   * @returns Updated user entity
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    try {
      await this.userRepository.update(id, updateData);
      const updatedUser = await this.findById(id);
      
      if (!updatedUser) {
        throw new Error('User not found after update');
      }
      
      this.logger.log(`User updated: ${updatedUser.email}`, 'UserService');
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update user: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Get user profile with sanitized data
   */
  async getProfile(id: string): Promise<any> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        preferredLanguage: user.preferredLanguage,
        timezone: user.timezone,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        isFirstLogin: user.isFirstLogin,
        lastActiveAt: user.lastActiveAt,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        notificationPreferences: user.notificationPreferences,
      };
    } catch (error) {
      this.logger.error(`Failed to get user profile: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: any): Promise<any> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Update specific preferences
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...preferences,
      };

      if (preferences.language) {
        user.preferredLanguage = preferences.language;
      }

      if (preferences.timezone) {
        user.timezone = preferences.timezone;
      }

      const updatedUser = await this.userRepository.save(user);
      this.logger.log(`User preferences updated: ${id}`, 'UserService');

      return {
        notificationPreferences: updatedUser.notificationPreferences,
        preferredLanguage: updatedUser.preferredLanguage,
        timezone: updatedUser.timezone,
      };
    } catch (error) {
      this.logger.error(`Failed to update user preferences: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Complete onboarding for user
   */
  async completeOnboarding(id: string, onboardingData?: any): Promise<any> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      user.hasCompletedOnboarding = true;
      user.isFirstLogin = false;

      // Apply any onboarding data
      if (onboardingData) {
        if (onboardingData.fullName) {
          user.fullName = onboardingData.fullName;
        }
        if (onboardingData.preferredLanguage) {
          user.preferredLanguage = onboardingData.preferredLanguage;
        }
        if (onboardingData.timezone) {
          user.timezone = onboardingData.timezone;
        }
        if (onboardingData.notificationPreferences) {
          user.notificationPreferences = {
            ...user.notificationPreferences,
            ...onboardingData.notificationPreferences,
          };
        }
      }

      const updatedUser = await this.userRepository.save(user);
      this.logger.log(`User onboarding completed: ${id}`, 'UserService');

      return {
        hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
        isFirstLogin: updatedUser.isFirstLogin,
        message: 'Onboarding completed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to complete onboarding: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Get user activity status
   */
  async getUserActivity(id: string): Promise<any> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      const lastActive = user.lastActiveAt || user.createdAt;
      const timeSinceActive = now.getTime() - lastActive.getTime();
      
      // Consider user active if they were active within the last 5 minutes
      const isOnline = timeSinceActive < 5 * 60 * 1000;

      return {
        userId: user.id,
        isOnline,
        lastActiveAt: user.lastActiveAt,
        lastLoginAt: user.lastLoginAt,
        accountCreatedAt: user.createdAt,
        timeSinceActive: Math.floor(timeSinceActive / 1000), // in seconds
      };
    } catch (error) {
      this.logger.error(`Failed to get user activity: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(id: string, avatarUrl: string): Promise<any> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      user.avatarUrl = avatarUrl;
      const updatedUser = await this.userRepository.save(user);
      
      this.logger.log(`User avatar updated: ${id}`, 'UserService');

      return {
        avatarUrl: updatedUser.avatarUrl,
        message: 'Avatar updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update user avatar: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(id: string): Promise<any> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // TODO: Integrate with other services to get comprehensive stats
      return {
        userId: user.id,
        accountAge: Math.floor((new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        preferredLanguage: user.preferredLanguage,
        timezone: user.timezone,
        // These would come from other services
        totalCourses: 0,
        completedCourses: 0,
        totalQuizzes: 0,
        totalCertificates: 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get user stats: ${id}`, 'UserService', error.stack);
      throw error;
    }
  }
}