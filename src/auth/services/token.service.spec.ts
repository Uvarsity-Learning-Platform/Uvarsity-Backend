import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { TokenService } from './token.service';
import { LoggerService } from '../../common/services/logger.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../user/entities/user.entity';

describe('TokenService', () => {
  let service: TokenService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let userRepository: Repository<User>;
  let loggerService: LoggerService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    fullName: 'John Doe',
  };

  const mockRefreshToken = {
    id: 'token-id',
    tokenHash: 'hashed-token',
    userId: 'test-user-id',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    isValid: () => true,
    updateLastUsed: () => {},
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
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
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    loggerService = module.get<LoggerService>(LoggerService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate access token for valid user ID and email', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      
      const token = await service.generateAccessToken(userId, email);

      expect(token).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: userId,
        email,
        iat: expect.any(Number),
      });
      expect(loggerService.debug).toHaveBeenCalledWith(
        `Generating access token for user: ${userId}`,
        'TokenService',
      );
    });

    it('should log token generation attempts', async () => {
      const userId = 'user-456';
      const email = 'test2@example.com';
      
      await service.generateAccessToken(userId, email);

      expect(loggerService.debug).toHaveBeenCalledTimes(1);
      expect(loggerService.debug).toHaveBeenCalledWith(
        `Generating access token for user: ${userId}`,
        'TokenService',
      );
    });

    it('should handle different user ID formats', async () => {
      const testCases = [
        { userId: 'uuid-123-456-789', email: 'user1@example.com' },
        { userId: 'user_001', email: 'user2@example.com' },
        { userId: '12345', email: 'user3@example.com' },
      ];

      for (const testCase of testCases) {
        const token = await service.generateAccessToken(testCase.userId, testCase.email);
        expect(token).toBe('mock-jwt-token');
      }
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token for valid user ID', async () => {
      const userId = 'user-123';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const ipAddress = '127.0.0.1';

      const mockCreatedToken = {
        ...mockRefreshToken,
        userId: userId,
      };

      refreshTokenRepository.create = jest.fn().mockReturnValue(mockCreatedToken);
      refreshTokenRepository.save = jest.fn().mockResolvedValue(mockCreatedToken);

      const result = await service.generateRefreshToken(userId, userAgent, ipAddress);

      expect(result).toHaveProperty('tokenHash');
      expect(result).toHaveProperty('userId');
      expect(result.userId).toBe(userId);
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(loggerService.debug).toHaveBeenCalledWith(
        `Generating refresh token for user: ${userId}`,
        'TokenService',
      );
    });

    it('should handle token generation without user agent', async () => {
      const userId = 'user-123';

      const mockCreatedToken = {
        ...mockRefreshToken,
        userId: userId,
      };

      refreshTokenRepository.create = jest.fn().mockReturnValue(mockCreatedToken);
      refreshTokenRepository.save = jest.fn().mockResolvedValue(mockCreatedToken);

      const result = await service.generateRefreshToken(userId);

      expect(result).toHaveProperty('tokenHash');
      expect(result.userId).toBe(userId);
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      refreshTokenRepository.findOne = jest.fn().mockResolvedValue(mockRefreshToken);
      refreshTokenRepository.save = jest.fn().mockResolvedValue(mockRefreshToken);
      jwtService.sign = jest.fn().mockReturnValue('new-access-token');

      const accessToken = await service.refreshAccessToken(refreshToken);

      expect(accessToken).toBe('new-access-token');
      expect(refreshTokenRepository.findOne).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(loggerService.debug).toHaveBeenCalledWith(
        'Processing token refresh request',
        'TokenService',
      );
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      refreshTokenRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const reason = 'user-logout';

      const mockTokenToRevoke = {
        ...mockRefreshToken,
        revoke: jest.fn(),
      };

      refreshTokenRepository.findOne = jest.fn().mockResolvedValue(mockTokenToRevoke);
      refreshTokenRepository.save = jest.fn().mockResolvedValue(mockTokenToRevoke);

      await service.revokeRefreshToken(refreshToken, reason);

      expect(mockTokenToRevoke.revoke).toHaveBeenCalledWith(reason);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(mockTokenToRevoke);
      expect(loggerService.debug).toHaveBeenCalledWith(
        'Revoking refresh token',
        'TokenService',
      );
    });

    it('should handle revoking non-existent token', async () => {
      const refreshToken = 'non-existent-token';

      refreshTokenRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.revokeRefreshToken(refreshToken)).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens', async () => {
      const deleteResult = { affected: 5 };
      refreshTokenRepository.delete = jest.fn().mockResolvedValue(deleteResult);

      await service.cleanupExpiredTokens();

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Object), // LessThan matcher
      });
      expect(loggerService.debug).toHaveBeenCalledWith(
        'Cleaning up expired refresh tokens',
        'TokenService',
      );
    });
  });
});