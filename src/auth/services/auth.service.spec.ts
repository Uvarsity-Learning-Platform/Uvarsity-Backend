import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { LoggerService } from '../../common/services/logger.service';
import { User } from '../../user/entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let loggerService: LoggerService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let tokenService: TokenService;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    fullName: 'John Doe',
    passwordHash: 'hashed-password',
    isActive: () => true,
    updateLastLogin: () => {},
    updateLastActivity: () => {},
    isEmailVerified: true,
    isFirstLogin: false,
    hasCompletedOnboarding: true,
  };

  const mockRefreshToken = {
    id: 'token-id',
    tokenHash: 'hashed-token',
    userId: 'test-user-id',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isRevoked: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            generateRefreshToken: jest.fn().mockResolvedValue(mockRefreshToken),
            refreshAccessToken: jest.fn().mockResolvedValue('new-access-token'),
            revokeAllUserTokens: jest.fn(),
            revokeRefreshToken: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
    loggerService = module.get<LoggerService>(LoggerService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registrationData: RegisterDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        fullName: 'John Doe',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(null);
      userRepository.create = jest.fn().mockReturnValue(mockUser);
      userRepository.save = jest.fn().mockResolvedValue(mockUser);

      const result = await service.register(registrationData);

      expect(result).toEqual({
        message: 'User registered successfully',
        userId: mockUser.id,
        email: mockUser.email,
        emailVerificationRequired: true,
        note: 'Please check your email for verification instructions',
      });

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('User registration attempt'),
        'AuthService',
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const registrationData: RegisterDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        fullName: 'John Doe',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);

      await expect(service.register(registrationData)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should handle login attempts', async () => {
      const loginData: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('User login attempt'),
        'AuthService',
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        message: 'Token refreshed successfully',
      });

      expect(tokenService.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      tokenService.refreshAccessToken = jest.fn().mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid user ID', async () => {
      const userId = 'test-user-id';

      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      userRepository.save = jest.fn().mockResolvedValue(mockUser);

      const result = await service.validateUser(userId);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should return null for invalid user ID', async () => {
      const userId = 'invalid-user-id';

      userRepository.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.validateUser(userId);

      expect(result).toBeNull();
    });
  });
});