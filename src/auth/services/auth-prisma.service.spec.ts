import { Test, TestingModule } from '@nestjs/testing';
import { AuthPrismaService } from './auth-prisma.service';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthPrismaService', () => {
  let service: AuthPrismaService;
  let prismaService: PrismaService;
  let loggerService: LoggerService;
  let tokenService: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  const mockTokenService = {
    generateEmailVerificationToken: jest.fn(),
    verifyEmailVerificationToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPrismaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthPrismaService>(AuthPrismaService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);
    tokenService = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      phone: '+1234567890',
      preferredLanguage: 'en',
      timezone: 'UTC',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: registerData.email.toLowerCase(),
        fullName: registerData.fullName,
        phone: registerData.phone,
        passwordHash: 'hashed-password',
        role: 'user',
        isEmailVerified: false,
        isPhoneVerified: false,
        status: 'active',
        oauthProvider: null,
        oauthProviderId: null,
        preferredLanguage: 'en',
        timezone: 'UTC',
        notificationPreferences: '{}',
        hasCompletedOnboarding: false,
        isFirstLogin: true,
        lastActiveAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(registerData);

      expect(result).toEqual({
        message: 'User registered successfully. Please check your email for verification.',
        userId: mockUser.id,
        email: mockUser.email,
        emailVerificationRequired: true,
        note: 'Email verification is required before full account access',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email.toLowerCase() },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: registerData.email.toLowerCase(),
          fullName: registerData.fullName,
          phone: registerData.phone,
          passwordHash: 'hashed-password',
          role: 'user',
        }),
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `User registered successfully: ${mockUser.email} (ID: ${mockUser.id})`,
        'AuthPrismaService',
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: registerData.email.toLowerCase(),
        fullName: 'Existing User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.register(registerData)).rejects.toThrow(ConflictException);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Registration failed for email: ${registerData.email}`,
        'AuthPrismaService',
        expect.any(String),
      );
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-id',
      email: loginData.email.toLowerCase(),
      fullName: 'Test User',
      phone: null,
      avatarUrl: null,
      passwordHash: 'hashed-password',
      isEmailVerified: true,
      isPhoneVerified: false,
      status: 'active',
      role: 'user',
      oauthProvider: null,
      oauthProviderId: null,
      preferredLanguage: 'en',
      timezone: 'UTC',
      notificationPreferences: '{}',
      hasCompletedOnboarding: false,
      isFirstLogin: true,
      lastActiveAt: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('should login user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockConfigService.get.mockReturnValue('1h');

      const result = await service.login(loginData, 'user-agent', '127.0.0.1');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          role: mockUser.role,
          isEmailVerified: mockUser.isEmailVerified,
          isFirstLogin: mockUser.isFirstLogin,
          hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          lastLoginAt: expect.any(Date),
          lastActiveAt: expect.any(Date),
          isFirstLogin: false,
        },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `User logged in successfully: ${mockUser.email} (ID: ${mockUser.id})`,
        'AuthPrismaService',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Login failed for email: ${loginData.email}`,
        'AuthPrismaService',
        expect.any(String),
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is not active', async () => {
      const inactiveUser = { ...mockUser, status: 'suspended' };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'refresh-token';
      const mockStoredToken = {
        id: 'token-id',
        tokenHash: 'hashed-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isRevoked: false,
        createdAt: new Date(),
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        status: 'active',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.update.mockResolvedValue(mockStoredToken);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          fullName: mockUser.fullName,
          role: mockUser.role,
          isEmailVerified: mockUser.isEmailVerified,
        },
      });
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockStoredToken.id },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      const revokedToken = {
        id: 'token-id',
        tokenHash: 'hashed-token',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true,
        createdAt: new Date(),
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(revokedToken);

      await expect(service.refreshToken('revoked-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'refresh-token';
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout(refreshToken);

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'hashed-token' },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revocationReason: 'User logout',
        },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'User logged out successfully',
        'AuthPrismaService',
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verificationData = { email: 'test@example.com', token: 'email-token' };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isEmailVerified: true });

      const result = await service.verifyEmail(verificationData);

      expect(result).toEqual({
        message: 'Email verified successfully',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: verificationData.email },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isEmailVerified: true },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Email verified successfully for user: ${mockUser.id}`,
        'AuthPrismaService',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const verificationData = { email: 'test@example.com', token: 'email-token' };
      
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(verificationData)).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Email verification failed',
        'AuthPrismaService',
        expect.any(String),
      );
    });
  });

  describe('validateUser', () => {
    it('should validate user successfully', async () => {
      const payload = { sub: 'user-id' };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        status: 'active',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastActiveAt: expect.any(Date) },
      });
    });

    it('should return null if user not found', async () => {
      const payload = { sub: 'user-id' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should return null if user is not active', async () => {
      const payload = { sub: 'user-id' };
      const inactiveUser = {
        id: 'user-id',
        email: 'test@example.com',
        status: 'suspended',
        deletedAt: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredTokens();

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { isRevoked: true },
          ],
        },
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Cleaned up 5 expired/revoked tokens',
        'AuthPrismaService',
      );
    });
  });
});