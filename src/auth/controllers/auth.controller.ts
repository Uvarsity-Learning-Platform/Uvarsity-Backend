import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResetPasswordDto, ForgotPasswordDto } from '../dto/reset-password.dto';

/**
 * Authentication Controller for Uvarsity Backend
 * 
 * This controller handles all authentication HTTP endpoints:
 * - User registration (email/password)
 * - User login (email/password)
 * - Phone verification and OTP
 * - OAuth authentication (Google, etc.)
 * - Token refresh and logout
 * - Password reset functionality
 * 
 * All endpoints include comprehensive validation, rate limiting,
 * and security measures to protect against common attacks.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user account
   * Handles email/password registration with email verification
   */
  @Post('register')
  @ApiOperation({
    summary: 'Register new user account',
    description: 'Create a new user account with email and password. Sends verification email.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully, verification email sent',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid registration data or email already exists',
  })
  async register(@Body() registrationData: RegisterDto) {
    return this.authService.register(registrationData);
  }

  /**
   * Login with email and password
   * Validates credentials and returns JWT tokens
   */
  @Post('login')
  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Authenticate user and return access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, tokens returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginData: LoginDto, @Request() req) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    return this.authService.login(loginData, userAgent, ipAddress);
  }

  /**
   * Refresh access token
   * Uses refresh token to generate new access token
   */
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Use refresh token to get new access token',
  })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(@Body() refreshData: RefreshTokenDto) {
    return this.authService.refreshToken(refreshData.refreshToken);
  }

  /**
   * Verify email address
   * Uses verification token to confirm email
   */
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using verification token',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification token',
  })
  async verifyEmail(@Body() verifyData: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyData);
  }

  /**
   * Request password reset
   * Sends password reset email to user
   */
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset email to user',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
  })
  async forgotPassword(@Body() forgotData: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotData);
  }

  /**
   * Reset password with token
   * Sets new password using reset token
   */
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using reset token',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reset token or password',
  })
  async resetPassword(@Body() resetData: ResetPasswordDto) {
    return this.authService.resetPassword(resetData);
  }

  /**
   * Logout user
   * Revokes refresh token and ends session
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke refresh token and end user session',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
  })
  async logout(@Request() req, @Body() body: { refreshToken?: string }) {
    const userId = req.user.id;
    return this.authService.logout(userId, body.refreshToken);
  }

  /**
   * Get current user profile
   * Returns authenticated user's profile information
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get authenticated user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getProfile(@Request() req) {
    const user = req.user;
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
      lastLoginAt: user.lastLoginAt,
    };
  }
}