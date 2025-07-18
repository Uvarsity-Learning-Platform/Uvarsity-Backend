import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminUserService } from '../services/admin-user.service';
import { AdminUserFilterDto, AdminUpdateUserDto, AdminCreateUserDto } from '../dto/admin-user.dto';
import { AdminBulkUserOperationDto, AdminDashboardStatsDto } from '../dto/admin-dashboard.dto';
import { AdminOnly } from '../decorators/role.decorator';

/**
 * Admin User Controller
 * 
 * Handles all user management operations for admin panel:
 * - User listing and filtering
 * - User creation and updates
 * - User role management
 * - Bulk user operations
 * - User statistics and analytics
 */
@ApiTags('Admin - User Management')
@Controller('admin/users')
@UseGuards(AdminGuard)
@ApiBearerAuth()
@AdminOnly()
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  /**
   * Get paginated list of users with filtering options
   */
  @Get()
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(@Query() filterDto: AdminUserFilterDto) {
    return await this.adminUserService.getUsers(filterDto);
  }

  /**
   * Get detailed user information by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return await this.adminUserService.getUserById(id);
  }

  /**
   * Create a new user (admin only)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async createUser(@Body() createUserDto: AdminCreateUserDto) {
    return await this.adminUserService.createUser(createUserDto);
  }

  /**
   * Update user information
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: AdminUpdateUserDto) {
    return await this.adminUserService.updateUser(id, updateUserDto);
  }

  /**
   * Delete user (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return await this.adminUserService.deleteUser(id);
  }

  /**
   * Perform bulk operations on users
   */
  @Post('bulk-operation')
  @ApiOperation({ summary: 'Perform bulk operations on users' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed successfully' })
  @ApiResponse({ status: 404, description: 'No users found' })
  async bulkUserOperation(@Body() bulkOperationDto: AdminBulkUserOperationDto) {
    return await this.adminUserService.bulkUserOperation(bulkOperationDto);
  }

  /**
   * Get user statistics for dashboard
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get user statistics for dashboard' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStatistics(@Query() statsDto: AdminDashboardStatsDto) {
    return await this.adminUserService.getUserStatistics(statsDto);
  }

  /**
   * Promote user to admin role
   */
  @Put(':id/promote-to-admin')
  @ApiOperation({ summary: 'Promote user to admin role' })
  @ApiResponse({ status: 200, description: 'User promoted to admin successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async promoteToAdmin(@Param('id') id: string) {
    return await this.adminUserService.updateUser(id, { role: 'admin' });
  }

  /**
   * Promote user to instructor role
   */
  @Put(':id/promote-to-instructor')
  @ApiOperation({ summary: 'Promote user to instructor role' })
  @ApiResponse({ status: 200, description: 'User promoted to instructor successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async promoteToInstructor(@Param('id') id: string) {
    return await this.adminUserService.updateUser(id, { role: 'instructor' });
  }

  /**
   * Demote user to regular user role
   */
  @Put(':id/demote-to-user')
  @ApiOperation({ summary: 'Demote user to regular user role' })
  @ApiResponse({ status: 200, description: 'User demoted to regular user successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async demoteToUser(@Param('id') id: string) {
    return await this.adminUserService.updateUser(id, { role: 'user' });
  }

  /**
   * Suspend user account
   */
  @Put(':id/suspend')
  @ApiOperation({ summary: 'Suspend user account' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(@Param('id') id: string) {
    return await this.adminUserService.updateUser(id, { status: 'suspended' });
  }

  /**
   * Reactivate user account
   */
  @Put(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate user account' })
  @ApiResponse({ status: 200, description: 'User reactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivateUser(@Param('id') id: string) {
    return await this.adminUserService.updateUser(id, { status: 'active' });
  }
}