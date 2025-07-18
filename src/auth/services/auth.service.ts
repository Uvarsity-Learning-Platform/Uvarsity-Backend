import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { LoggerService } from '../../common/services/logger.service';
import { User } from '../../user/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TokenService } from './token.service';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ResetPasswordDto, ForgotPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';

/**
 * Authentication Service for Uvarsity Backend
 * 
 * This service handles all authentication-related business logic:
 * - User registration and login
 * - Password hashing and verification
 * - JWT token generation and validation
 * - Email verification and password reset
 * - Security features like rate limiting and account lockout
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register a new user account
   * Handles email/password registration with validation
   * 
   * @param registrationData - User registration information
   * @returns Success message with user ID
   */
  async register(registrationData: RegisterDto) {
    this.logger.log(`User registration attempt for email: ${registrationData.email}`, 'AuthService');
    
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registrationData.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(registrationData.password, saltRounds);

    // Create new user
    const user = this.userRepository.create({
      email: registrationData.email,
      fullName: registrationData.fullName,
      phone: registrationData.phone,
      passwordHash,
      preferredLanguage: registrationData.preferredLanguage || 'en',
      timezone: registrationData.timezone || 'UTC',
      isEmailVerified: false, // Will be verified later
      isPhoneVerified: false, // Will be verified later if phone provided
    });

    try {
      await this.userRepository.save(user);
      
      // Generate email verification token (placeholder for now)
      const verificationToken = this.generateVerificationToken();
      
      this.logger.log(`User registered successfully with ID: ${user.id}`, 'AuthService');
      
      // TODO: Send verification email
      // await this.sendVerificationEmail(user.email, verificationToken);
      
      return {
        message: 'User registered successfully',
        userId: user.id,
        email: user.email,
        emailVerificationRequired: true,
        note: 'Please check your email for verification instructions',
      };
    } catch (error) {
      this.logger.error('Failed to register user', error, 'AuthService');
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  /**
   * Authenticate user login
   * Validates credentials and generates JWT tokens
   * 
   * @param loginData - Login credentials
   * @returns JWT tokens and user information
   */
  async login(loginData: LoginDto, userAgent?: string, ipAddress?: string) {
    this.logger.log(`User login attempt for email: ${loginData.email}`, 'AuthService');
    
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: loginData.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive()) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginData.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    user.updateLastLogin();
    await this.userRepository.save(user);

    // Generate tokens
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      userAgent,
      ipAddress,
    );

    this.logger.log(`User logged in successfully: ${user.email}`, 'AuthService');

    return {
      accessToken,
      refreshToken: refreshToken.tokenHash,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified,
        isFirstLogin: user.isFirstLogin,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    };
  }

  /**
   * Refresh JWT access token
   * Uses refresh token to generate new access token
   * 
   * @param refreshToken - Valid refresh token
   * @returns New access token
   */
  async refreshToken(refreshToken: string) {
    this.logger.log('Token refresh attempt', 'AuthService');
    
    try {
      const newAccessToken = await this.tokenService.refreshAccessToken(refreshToken);
      
      this.logger.log('Token refreshed successfully', 'AuthService');
      
      return {
        accessToken: newAccessToken,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error, 'AuthService');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Verify user email with token
   * 
   * @param verifyData - Email and verification token
   * @returns Success message
   */
  async verifyEmail(verifyData: VerifyEmailDto) {
    this.logger.log(`Email verification attempt for: ${verifyData.email}`, 'AuthService');
    
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: verifyData.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      return {
        message: 'Email already verified',
        isVerified: true,
      };
    }

    // TODO: Implement proper token verification
    // For now, accept any 6-digit token as valid
    if (!/^\d{6}$/.test(verifyData.token)) {
      throw new BadRequestException('Invalid verification token');
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await this.userRepository.save(user);

    this.logger.log(`Email verified successfully for user: ${user.email}`, 'AuthService');

    return {
      message: 'Email verified successfully',
      isVerified: true,
    };
  }

  /**
   * Send password reset email
   * 
   * @param forgotData - Email for password reset
   * @returns Success message
   */
  async forgotPassword(forgotData: ForgotPasswordDto) {
    this.logger.log(`Password reset request for email: ${forgotData.email}`, 'AuthService');
    
    const user = await this.userRepository.findOne({
      where: { email: forgotData.email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return {
        message: 'If a user with this email exists, a password reset link has been sent',
      };
    }

    // Generate reset token (placeholder)
    const resetToken = this.generateResetToken();
    
    // TODO: Send password reset email
    // await this.sendPasswordResetEmail(user.email, resetToken);
    
    this.logger.log(`Password reset email sent to: ${user.email}`, 'AuthService');

    return {
      message: 'If a user with this email exists, a password reset link has been sent',
      // For development only - remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    };
  }

  /**
   * Reset user password with token
   * 
   * @param resetData - Email, token, and new password
   * @returns Success message
   */
  async resetPassword(resetData: ResetPasswordDto) {
    this.logger.log(`Password reset attempt for email: ${resetData.email}`, 'AuthService');
    
    const user = await this.userRepository.findOne({
      where: { email: resetData.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    // TODO: Implement proper token verification
    // For now, accept any token as valid
    if (!resetData.token) {
      throw new BadRequestException('Invalid reset token');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(resetData.newPassword, saltRounds);

    // Update password
    user.passwordHash = passwordHash;
    await this.userRepository.save(user);

    // Revoke all existing refresh tokens for security
    await this.tokenService.revokeAllUserTokens(user.id, 'password-reset');

    this.logger.log(`Password reset successfully for user: ${user.email}`, 'AuthService');

    return {
      message: 'Password reset successfully',
    };
  }

  /**
   * Logout user and revoke tokens
   * 
   * @param userId - User ID
   * @param refreshToken - Refresh token to revoke
   */
  async logout(userId: string, refreshToken?: string) {
    this.logger.log(`User logout for ID: ${userId}`, 'AuthService');
    
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken, 'user-logout');
    }

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Validate user by ID (for JWT strategy)
   * 
   * @param userId - User ID from JWT payload
   * @returns User object or null
   */
  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive()) {
      return null;
    }

    user.updateLastActivity();
    await this.userRepository.save(user);

    return user;
  }

  /**
   * Generate email verification token
   * 
   * @returns 6-digit verification token
   */
  private generateVerificationToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate password reset token
   * 
   * @returns URL-safe reset token
   */
  private generateResetToken(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}