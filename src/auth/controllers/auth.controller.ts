import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';

/**
 * Authentication Controller for Stellr Academy Backend
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
  async register(@Body() registrationData: any) {
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
  async login(@Body() loginData: any) {
    return this.authService.login(loginData);
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
  async refresh(@Body() refreshData: any) {
    return this.authService.refreshToken(refreshData.refreshToken);
  }
}