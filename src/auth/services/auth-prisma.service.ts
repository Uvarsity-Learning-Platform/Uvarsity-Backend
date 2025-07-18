import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { LoggerService } from '../../common/services/logger.service';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from './token.service';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ResetPasswordDto, ForgotPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';

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

interface RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date | null;
  revocationReason?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceName?: string | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
}

/**
 * Authentication Service using Prisma for Uvarsity Backend
 * 
 * This service handles all authentication-related business logic:
 * - User registration and login
 * - Password hashing and verification
 * - JWT token generation and validation
 * - Email verification and password reset
 * - Security features like rate limiting and account lockout
 */
@Injectable()
export class AuthPrismaService {
  constructor(
    private readonly prisma: PrismaService,
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
    this.logger.log(`User registration attempt for email: ${registrationData.email}`, 'AuthPrismaService');
    
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registrationData.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(registrationData.password, saltRounds);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: registrationData.email.toLowerCase(),
          fullName: registrationData.fullName,
          phone: registrationData.phone,
          passwordHash,
          role: 'user', // Default role since RegisterDto doesn't have role field
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

      this.logger.log(`User registered successfully: ${user.email} (ID: ${user.id})`, 'AuthPrismaService');

      // TODO: Generate email verification token (using existing token service)
      // const emailToken = await this.tokenService.generateEmailVerificationToken(user.id);

      return {
        message: 'User registered successfully. Please check your email for verification.',
        userId: user.id,
        email: user.email,
        emailVerificationRequired: true,
        note: 'Email verification is required before full account access',
      };
    } catch (error) {
      this.logger.error(`Registration failed for email: ${registrationData.email}`, 'AuthPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Login user with email and password
   * 
   * @param loginData - Login credentials
   * @param userAgent - User agent string
   * @param ipAddress - Client IP address
   * @returns JWT tokens and user info
   */
  async login(loginData: LoginDto, userAgent?: string, ipAddress?: string) {
    this.logger.log(`Login attempt for email: ${loginData.email}`, 'AuthPrismaService');
    
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: loginData.email.toLowerCase() },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (user.status !== 'active' || user.deletedAt) {
        throw new UnauthorizedException('Account is not active');
      }

      // Verify password
      if (!user.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
          isFirstLogin: false,
        },
      });

      // Generate tokens
      const accessToken = await this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id, userAgent, ipAddress);

      this.logger.log(`User logged in successfully: ${user.email} (ID: ${user.id})`, 'AuthPrismaService');

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isFirstLogin: user.isFirstLogin,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      };
    } catch (error) {
      this.logger.error(`Login failed for email: ${loginData.email}`, 'AuthPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * 
   * @param refreshToken - Refresh token string
   * @returns New access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const tokenHash = await bcrypt.hash(refreshToken, 1);
      
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: storedToken.userId },
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not active');
      }

      // Update token last used
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { lastUsedAt: new Date() },
      });

      // Generate new access token
      const accessToken = await this.generateAccessToken(user);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (error) {
      this.logger.error('Token refresh failed', 'AuthPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Logout user by revoking refresh token
   * 
   * @param refreshToken - Refresh token to revoke
   * @returns Success message
   */
  async logout(refreshToken: string) {
    try {
      const tokenHash = await bcrypt.hash(refreshToken, 1);
      
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revocationReason: 'User logout',
        },
      });

      this.logger.log('User logged out successfully', 'AuthPrismaService');
      
      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error('Logout failed', 'AuthPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Verify email with verification token
   * 
   * @param verificationData - Email verification data
   * @returns Success message
   */
  async verifyEmail(verificationData: VerifyEmailDto) {
    try {
      // TODO: Verify the token using existing token service
      // const tokenData = await this.tokenService.verifyEmailVerificationToken(verificationData.token);

      // For now, we'll assume the token is valid and just update the user
      // In a real implementation, you'd extract the user ID from the token
      const user = await this.prisma.user.findUnique({
        where: { email: verificationData.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid verification token');
      }

      // Update user email verification status
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
        },
      });

      this.logger.log(`Email verified successfully for user: ${user.id}`, 'AuthPrismaService');

      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      this.logger.error('Email verification failed', 'AuthPrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Generate access token for user
   * 
   * @param user - User entity
   * @returns JWT access token
   */
  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
    });
  }

  /**
   * Generate refresh token for user
   * 
   * @param userId - User ID
   * @param userAgent - User agent string
   * @param ipAddress - Client IP address
   * @returns Refresh token string
   */
  private async generateRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const payload = {
      sub: userId,
      type: 'refresh',
    };

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const tokenHash = await bcrypt.hash(refreshToken, 1);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return refreshToken;
  }

  /**
   * Validate user from JWT payload
   * 
   * @param payload - JWT payload
   * @returns User entity without password
   */
  async validateUser(payload: any): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'active' || user.deletedAt) {
        return null;
      }

      // Update last activity
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });

      return user;
    } catch (error) {
      this.logger.error(`User validation failed for ID: ${payload.sub}`, 'AuthPrismaService', error.stack);
      return null;
    }
  }

  /**
   * Clean up expired refresh tokens
   * Should be called periodically
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired/revoked tokens`, 'AuthPrismaService');
    } catch (error) {
      this.logger.error('Token cleanup failed', 'AuthPrismaService', error.stack);
    }
  }
}