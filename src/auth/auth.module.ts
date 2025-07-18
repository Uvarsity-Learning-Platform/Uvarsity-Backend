import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthPrismaService } from './services/auth-prisma.service';
import { TokenService } from './services/token.service';
import { OAuthService } from './services/oauth.service';

import { User } from '../user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

import { CommonModule } from '../common/common.module';

/**
 * Authentication Module for Uvarsity Backend
 * 
 * This module handles all authentication-related functionality including:
 * 
 * 🔐 Core Features:
 * - User registration with email verification
 * - Email/password login with secure hashing
 * - Phone number registration and OTP verification
 * - JWT token generation and validation
 * - Refresh token management and rotation
 * - OAuth integration (Google, future: Facebook, Apple)
 * - Rate limiting for auth endpoints
 * - Password reset functionality
 * - Account lockout after failed attempts
 * 
 * 🛡️ Security Features:
 * - BCrypt password hashing with salt rounds
 * - JWT token expiration and refresh mechanisms
 * - Secure token storage and blacklisting
 * - CSRF protection for sensitive operations
 * - Rate limiting to prevent brute force attacks
 * - Input validation and sanitization
 * 
 * 📱 Multi-channel Authentication:
 * - Email-based registration and login
 * - Phone number verification via SMS (Twilio)
 * - Social OAuth (Google OAuth 2.0)
 * - Future: Apple Sign-In, Facebook Login
 * 
 * 🏗️ Architecture:
 * - Controller: Handles HTTP requests and responses
 * - Service: Contains business logic for authentication
 * - Guards: Protect routes with authentication checks
 * - Strategies: Define authentication methods (JWT, Local, OAuth)
 * - DTOs: Data transfer objects for request/response validation
 * - Entities: Database models for users and tokens
 */
@Module({
  imports: [
    // Import common utilities and error handling
    CommonModule,
    
    // Configure JWT module with async configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),
          issuer: 'stellr-academy',
          audience: 'stellr-users',
        },
      }),
      inject: [ConfigService],
    }),

    // Configure Passport for authentication strategies
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false,
    }),

    // TypeORM entities for database operations
    TypeOrmModule.forFeature([
      User,         // User entity from user module
      RefreshToken, // Refresh token storage
    ]),
  ],

  controllers: [
    AuthController, // Handles auth HTTP endpoints
  ],

  providers: [
    // Core authentication services
    AuthService,    // Main authentication business logic (TypeORM)
    AuthPrismaService, // Main authentication business logic (Prisma)
    TokenService,   // JWT and refresh token management
    OAuthService,   // OAuth integration (Google, etc.)

    // Passport strategies for different auth methods
    JwtStrategy,    // JWT token validation strategy
    LocalStrategy,  // Username/password validation strategy

    // Guards for route protection
    JwtAuthGuard,   // JWT-based route protection
    LocalAuthGuard, // Local login guard
  ],

  exports: [
    AuthService,    // Export for use in other modules
    AuthPrismaService, // Export Prisma service for gradual migration
    TokenService,   // Export for token operations in other modules
    JwtAuthGuard,   // Export for protecting routes in other modules
  ],
})
export class AuthModule {
  /**
   * Authentication module constructor
   * Logs successful initialization of auth services
   */
  constructor() {
    console.log('🔐 Authentication module initialized - JWT, OAuth, and local auth ready (TypeORM + Prisma)');
  }
}