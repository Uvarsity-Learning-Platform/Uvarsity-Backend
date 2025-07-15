import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoggerService } from '../../common/services/logger.service';

/**
 * User Service for Stellr Academy Backend
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
}