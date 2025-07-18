import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { CourseEnrollment } from '../../course/entities/course-enrollment.entity';
import { AdminUserFilterDto, AdminUpdateUserDto, AdminCreateUserDto } from '../dto/admin-user.dto';
import { AdminBulkUserOperationDto, AdminDashboardStatsDto } from '../dto/admin-dashboard.dto';
import { AuthService } from '../../auth/services/auth.service';
import { LoggerService } from '../../common/services/logger.service';

/**
 * Admin User Service
 * 
 * Handles all user management operations for admin panel:
 * - User listing with filtering and pagination
 * - User creation and updates
 * - Bulk operations on users
 * - User role management
 * - User statistics and analytics
 */
@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get paginated list of users with filtering
   */
  async getUsers(filterDto: AdminUserFilterDto) {
    const { search, role, status, isEmailVerified, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = filterDto;
    
    const query = this.userRepository.createQueryBuilder('user');
    
    // Apply search filter
    if (search) {
      query.where('(user.fullName ILIKE :search OR user.email ILIKE :search)', { search: `%${search}%` });
    }
    
    // Apply role filter
    if (role) {
      query.andWhere('user.role = :role', { role });
    }
    
    // Apply status filter
    if (status) {
      query.andWhere('user.status = :status', { status });
    }
    
    // Apply email verification filter
    if (isEmailVerified !== undefined) {
      query.andWhere('user.isEmailVerified = :isEmailVerified', { isEmailVerified });
    }
    
    // Apply pagination and sorting
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);
    query.orderBy(`user.${sortBy}`, sortOrder);
    
    const [users, total] = await query.getManyAndCount();
    
    // Get user progress data
    const userProgresses = await this.getUserProgressSummaries(users.map(u => u.id));
    
    // Combine user data with progress
    const usersWithProgress = users.map(user => ({
      ...user,
      progress: userProgresses[user.id] || {
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalCertificates: 0,
      }
    }));
    
    return {
      users: usersWithProgress,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user by ID with detailed information
   */
  async getUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Get user enrollments and progress
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
    
    const progressSummary = await this.getUserProgressSummaries([userId]);
    
    return {
      ...user,
      enrollments,
      progress: progressSummary[userId] || {
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalCertificates: 0,
      }
    };
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(createUserDto: AdminCreateUserDto) {
    const { email, fullName, phone, role = 'user', temporaryPassword, autoVerifyEmail = false } = createUserDto;
    
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phone }].filter(Boolean),
    });
    
    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }
    
    // Create user using registration flow
    const registrationResult = await this.authService.register({
      email,
      fullName,
      phone,
      password: temporaryPassword,
    });
    
    // Get the created user
    const user = await this.userRepository.findOne({
      where: { email },
    });
    
    if (!user) {
      throw new NotFoundException('User creation failed');
    }
    
    // Update role and verification status
    user.role = role;
    if (autoVerifyEmail) {
      user.isEmailVerified = true;
    }
    
    await this.userRepository.save(user);
    
    this.logger.log(`Admin created user: ${user.email} with role: ${role}`, 'AdminUserService');
    
    return user;
  }

  /**
   * Update user information (admin only)
   */
  async updateUser(userId: string, updateDto: AdminUpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Check for email conflicts if email is being updated
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }
    
    // Update user fields
    Object.assign(user, updateDto);
    
    await this.userRepository.save(user);
    
    this.logger.log(`Admin updated user: ${user.email}`, 'AdminUserService');
    
    return user;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    user.status = 'deleted';
    user.deletedAt = new Date();
    
    await this.userRepository.save(user);
    
    this.logger.log(`Admin deleted user: ${user.email}`, 'AdminUserService');
    
    return { message: 'User deleted successfully' };
  }

  /**
   * Bulk operations on users
   */
  async bulkUserOperation(bulkOperationDto: AdminBulkUserOperationDto) {
    const { userIds, operation, reason } = bulkOperationDto;
    
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
    });
    
    if (users.length === 0) {
      throw new NotFoundException('No users found');
    }
    
    let updatedUsers = [];
    
    switch (operation) {
      case 'activate':
        updatedUsers = await this.bulkActivateUsers(users);
        break;
      case 'suspend':
        updatedUsers = await this.bulkSuspendUsers(users, reason);
        break;
      case 'delete':
        updatedUsers = await this.bulkDeleteUsers(users);
        break;
      case 'promote_to_instructor':
        updatedUsers = await this.bulkPromoteToInstructor(users);
        break;
      case 'demote_to_user':
        updatedUsers = await this.bulkDemoteToUser(users);
        break;
    }
    
    this.logger.log(`Admin performed bulk operation: ${operation} on ${users.length} users`, 'AdminUserService');
    
    return {
      message: `Bulk operation ${operation} completed successfully`,
      affectedUsers: updatedUsers.length,
      users: updatedUsers,
    };
  }

  /**
   * Get user statistics for dashboard
   */
  async getUserStatistics(statsDto: AdminDashboardStatsDto) {
    const { range = '30d', startDate, endDate } = statsDto;
    
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      };
    } else {
      const now = new Date();
      const daysBack = this.getRangeInDays(range);
      const startOfPeriod = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      
      dateFilter = {
        createdAt: {
          $gte: startOfPeriod,
        },
      };
    }
    
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { status: 'active' } });
    const suspendedUsers = await this.userRepository.count({ where: { status: 'suspended' } });
    const deletedUsers = await this.userRepository.count({ where: { status: 'deleted' } });
    const adminUsers = await this.userRepository.count({ where: { role: 'admin' } });
    const instructorUsers = await this.userRepository.count({ where: { role: 'instructor' } });
    const verifiedUsers = await this.userRepository.count({ where: { isEmailVerified: true } });
    
    // Get new users in the specified period
    const newUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :startDate', { startDate: startDate || new Date(Date.now() - this.getRangeInDays(range) * 24 * 60 * 60 * 1000) })
      .getCount();
    
    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      deletedUsers,
      adminUsers,
      instructorUsers,
      verifiedUsers,
      newUsers,
      usersByStatus: {
        active: activeUsers,
        suspended: suspendedUsers,
        deleted: deletedUsers,
      },
      usersByRole: {
        admin: adminUsers,
        instructor: instructorUsers,
        user: totalUsers - adminUsers - instructorUsers,
      },
    };
  }

  // Private helper methods
  private async getUserProgressSummaries(userIds: string[]) {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId: In(userIds) },
      relations: ['course'],
    });
    
    const progressSummaries = {};
    
    enrollments.forEach(enrollment => {
      const userId = enrollment.userId;
      if (!progressSummaries[userId]) {
        progressSummaries[userId] = {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          totalCertificates: 0,
        };
      }
      
      progressSummaries[userId].totalCourses++;
      
      if (enrollment.isCompleted) {
        progressSummaries[userId].completedCourses++;
      } else {
        progressSummaries[userId].inProgressCourses++;
      }
      
      if (enrollment.certificateIssuedAt) {
        progressSummaries[userId].totalCertificates++;
      }
    });
    
    return progressSummaries;
  }

  private async bulkActivateUsers(users: User[]) {
    const updatedUsers = [];
    for (const user of users) {
      user.status = 'active';
      user.deletedAt = null;
      await this.userRepository.save(user);
      updatedUsers.push(user);
    }
    return updatedUsers;
  }

  private async bulkSuspendUsers(users: User[], reason?: string) {
    const updatedUsers = [];
    for (const user of users) {
      user.status = 'suspended';
      await this.userRepository.save(user);
      updatedUsers.push(user);
    }
    return updatedUsers;
  }

  private async bulkDeleteUsers(users: User[]) {
    const updatedUsers = [];
    for (const user of users) {
      user.status = 'deleted';
      user.deletedAt = new Date();
      await this.userRepository.save(user);
      updatedUsers.push(user);
    }
    return updatedUsers;
  }

  private async bulkPromoteToInstructor(users: User[]) {
    const updatedUsers = [];
    for (const user of users) {
      user.role = 'instructor';
      await this.userRepository.save(user);
      updatedUsers.push(user);
    }
    return updatedUsers;
  }

  private async bulkDemoteToUser(users: User[]) {
    const updatedUsers = [];
    for (const user of users) {
      user.role = 'user';
      await this.userRepository.save(user);
      updatedUsers.push(user);
    }
    return updatedUsers;
  }

  private getRangeInDays(range: string): number {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }
}