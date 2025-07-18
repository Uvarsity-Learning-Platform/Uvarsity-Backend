import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: string;
  role: string;
  oauthProvider?: string | null;
  oauthProviderId?: string | null;
  preferredLanguage: string;
  timezone: string;
  notificationPreferences: string;
  hasCompletedOnboarding: boolean;
  isFirstLogin: boolean;
  lastActiveAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * User Service using Prisma for Uvarsity Backend
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
export class UserPrismaService {
  constructor(
    private readonly prisma: PrismaService,
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
      const user = await this.prisma.user.findUnique({
        where: { id },
      });
      this.logger.debug(`User lookup by ID: ${id} - ${user ? 'Found' : 'Not found'}`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user by ID: ${id}`, 'UserPrismaService', error.stack);
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
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      this.logger.debug(`User lookup by email: ${email} - ${user ? 'Found' : 'Not found'}`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user by email: ${email}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Find a user by their phone number
   * 
   * @param phone - Phone number to search for
   * @returns User entity or null if not found
   */
  async findByPhone(phone: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { phone },
      });
      this.logger.debug(`User lookup by phone: ${phone} - ${user ? 'Found' : 'Not found'}`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user by phone: ${phone}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Create a new user
   * 
   * @param userData - User data for creation
   * @returns Created user entity
   */
  async create(userData: {
    email: string;
    fullName: string;
    phone?: string;
    passwordHash?: string;
    oauthProvider?: string;
    oauthProviderId?: string;
    avatarUrl?: string;
    role?: 'user' | 'admin' | 'instructor';
  }): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          email: userData.email.toLowerCase(),
          // Parse and set default notification preferences
          notificationPreferences: JSON.stringify({
            email: {
              courseUpdates: true,
              reminderNotifications: true,
              achievementAlerts: true,
              weeklyProgress: true,
            },
            sms: {
              reminderNotifications: false,
              urgentUpdates: false,
            },
            push: {
              lessonReminders: true,
              quizAvailable: true,
              achievementUnlocked: true,
            },
          }),
        },
      });

      this.logger.log(`User created successfully: ${user.email} (ID: ${user.id})`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${userData.email}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Update user information
   * 
   * @param id - User ID to update
   * @param updateData - Data to update
   * @returns Updated user entity
   */
  async update(id: string, updateData: Partial<User>): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`User updated successfully: ${user.email} (ID: ${user.id})`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to update user: ${id}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Soft delete a user (set deletedAt timestamp)
   * 
   * @param id - User ID to delete
   * @returns Deleted user entity
   */
  async softDelete(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'deleted',
        },
      });

      this.logger.log(`User soft deleted: ${user.email} (ID: ${user.id})`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to soft delete user: ${id}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Find users by role
   * 
   * @param role - User role to filter by
   * @returns Array of users with the specified role
   */
  async findByRole(role: 'user' | 'admin' | 'instructor'): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { 
          role,
          deletedAt: null, // Only active users
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.debug(`Found ${users.length} users with role: ${role}`, 'UserPrismaService');
      return users;
    } catch (error) {
      this.logger.error(`Failed to find users by role: ${role}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Get paginated list of users
   * 
   * @param page - Page number (1-based)
   * @param pageSize - Number of users per page
   * @param filters - Optional filters
   * @returns Paginated user list
   */
  async findMany(
    page: number = 1,
    pageSize: number = 10,
    filters: {
      role?: 'user' | 'admin' | 'instructor';
      status?: 'active' | 'suspended' | 'deleted';
      search?: string;
    } = {},
  ): Promise<{ users: User[]; total: number; totalPages: number }> {
    try {
      const skip = (page - 1) * pageSize;
      const where: any = {};

      // Apply filters
      if (filters.role) {
        where.role = filters.role;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.search) {
        where.OR = [
          { fullName: { contains: filters.search } },
          { email: { contains: filters.search } },
        ];
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      this.logger.debug(`Found ${users.length} users (page ${page}/${totalPages})`, 'UserPrismaService');
      
      return {
        users,
        total,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch users (page ${page})`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Update user's last activity timestamp
   * 
   * @param id - User ID
   * @returns Updated user entity
   */
  async updateLastActivity(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { lastActiveAt: new Date() },
      });

      this.logger.debug(`Updated last activity for user: ${id}`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to update last activity for user: ${id}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * 
   * @param id - User ID
   * @returns Updated user entity
   */
  async updateLastLogin(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { 
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
          isFirstLogin: false,
        },
      });

      this.logger.debug(`Updated last login for user: ${id}`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to update last login for user: ${id}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Complete user onboarding
   * 
   * @param id - User ID
   * @returns Updated user entity
   */
  async completeOnboarding(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          hasCompletedOnboarding: true,
          isFirstLogin: false,
        },
      });

      this.logger.log(`User completed onboarding: ${user.email} (ID: ${user.id})`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to complete onboarding for user: ${id}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   * 
   * @param id - User ID
   * @param preferences - New notification preferences
   * @returns Updated user entity
   */
  async updateNotificationPreferences(
    id: string,
    preferences: {
      email: {
        courseUpdates: boolean;
        reminderNotifications: boolean;
        achievementAlerts: boolean;
        weeklyProgress: boolean;
      };
      sms: {
        reminderNotifications: boolean;
        urgentUpdates: boolean;
      };
      push: {
        lessonReminders: boolean;
        quizAvailable: boolean;
        achievementUnlocked: boolean;
      };
    },
  ): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          notificationPreferences: JSON.stringify(preferences),
        },
      });

      this.logger.log(`Updated notification preferences for user: ${id}`, 'UserPrismaService');
      return user;
    } catch (error) {
      this.logger.error(`Failed to update notification preferences for user: ${id}`, 'UserPrismaService', error.stack);
      throw error;
    }
  }
}