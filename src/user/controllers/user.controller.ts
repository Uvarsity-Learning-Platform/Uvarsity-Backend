import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * User Controller for Stellr Academy Backend
 * 
 * This controller handles HTTP endpoints for user management:
 * - User profile viewing and editing
 * - User preferences and settings
 * - Account management operations
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
  async getCurrentUser() {
    // This is a placeholder implementation
    // In a full implementation, this would extract user ID from JWT token
    // and return the user's profile data
    return {
      message: 'User profile endpoint - Implementation in progress',
      note: 'This endpoint will return the authenticated user\'s profile data',
    };
  }
}