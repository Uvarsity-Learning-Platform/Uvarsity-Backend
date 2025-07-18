import { Controller, Get, Post, Put, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * User Controller for Uvarsity Backend
 * 
 * This controller handles HTTP endpoints for user management:
 * - User profile viewing and editing
 * - User preferences and settings
 * - Account management operations
 * - Onboarding flow management
 * 
 * All endpoints require authentication via JWT tokens.
 */
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get current user profile
   * Returns the authenticated user's profile information
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user\'s profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getCurrentUser(@Request() req) {
    const userId = req.user.id;
    return this.userService.getProfile(userId);
  }

  /**
   * Update user profile
   */
  @Put('me')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update the authenticated user\'s profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  async updateProfile(@Body() updateData: any, @Request() req) {
    const userId = req.user.id;
    const updatedUser = await this.userService.updateUser(userId, updateData);
    return this.userService.getProfile(updatedUser.id);
  }

  /**
   * Get user preferences
   */
  @Get('preferences')
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Get the authenticated user\'s notification and system preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences retrieved successfully',
  })
  async getPreferences(@Request() req) {
    const userId = req.user.id;
    const profile = await this.userService.getProfile(userId);
    return {
      notificationPreferences: profile.notificationPreferences,
      preferredLanguage: profile.preferredLanguage,
      timezone: profile.timezone,
    };
  }

  /**
   * Update user preferences
   */
  @Put('preferences')
  @ApiOperation({
    summary: 'Update user preferences',
    description: 'Update the authenticated user\'s notification and system preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences updated successfully',
  })
  async updatePreferences(@Body() preferences: any, @Request() req) {
    const userId = req.user.id;
    return this.userService.updatePreferences(userId, preferences);
  }

  /**
   * Complete user onboarding
   */
  @Post('onboarding/complete')
  @ApiOperation({
    summary: 'Complete user onboarding',
    description: 'Mark the user\'s onboarding process as complete',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding completed successfully',
  })
  async completeOnboarding(@Body() onboardingData: any, @Request() req) {
    const userId = req.user.id;
    return this.userService.completeOnboarding(userId, onboardingData);
  }

  /**
   * Get user activity status
   */
  @Get('activity')
  @ApiOperation({
    summary: 'Get user activity',
    description: 'Get the authenticated user\'s activity status and timestamps',
  })
  @ApiResponse({
    status: 200,
    description: 'User activity retrieved successfully',
  })
  async getUserActivity(@Request() req) {
    const userId = req.user.id;
    return this.userService.getUserActivity(userId);
  }

  /**
   * Update user avatar
   */
  @Put('avatar')
  @ApiOperation({
    summary: 'Update user avatar',
    description: 'Update the authenticated user\'s avatar URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar updated successfully',
  })
  async updateAvatar(@Body() avatarData: { avatarUrl: string }, @Request() req) {
    const userId = req.user.id;
    return this.userService.updateAvatar(userId, avatarData.avatarUrl);
  }

  /**
   * Get user statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Get comprehensive statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  async getUserStats(@Request() req) {
    const userId = req.user.id;
    return this.userService.getUserStats(userId);
  }
}