import { Test, TestingModule } from '@nestjs/testing';
import { UserPrismaService } from './user-prisma.service';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

describe('UserPrismaService', () => {
  let service: UserPrismaService;
  let prismaService: PrismaService;
  let loggerService: LoggerService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPrismaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<UserPrismaService>(UserPrismaService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should find a user by ID', async () => {
      const userId = 'test-id';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
        phone: null,
        avatarUrl: null,
        passwordHash: 'hashed-password',
        isEmailVerified: false,
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

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        `User lookup by ID: ${userId} - Found`,
        'UserPrismaService',
      );
    });

    it('should return null when user not found', async () => {
      const userId = 'non-existent-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById(userId);

      expect(result).toBeNull();
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        `User lookup by ID: ${userId} - Not found`,
        'UserPrismaService',
      );
    });

    it('should handle errors gracefully', async () => {
      const userId = 'test-id';
      const error = new Error('Database error');
      mockPrismaService.user.findUnique.mockRejectedValue(error);

      await expect(service.findById(userId)).rejects.toThrow('Database error');
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Failed to find user by ID: ${userId}`,
        'UserPrismaService',
        error.stack,
      );
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'test-id',
        email: email.toLowerCase(),
        fullName: 'Test User',
        phone: null,
        avatarUrl: null,
        passwordHash: 'hashed-password',
        isEmailVerified: false,
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

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
    });

    it('should normalize email to lowercase', async () => {
      const email = 'TEST@EXAMPLE.COM';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.findByEmail(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash: 'hashed-password',
      };

      const mockUser = {
        id: 'generated-id',
        ...userData,
        email: userData.email.toLowerCase(),
        phone: null,
        avatarUrl: null,
        isEmailVerified: false,
        isPhoneVerified: false,
        status: 'active',
        role: 'user',
        oauthProvider: null,
        oauthProviderId: null,
        preferredLanguage: 'en',
        timezone: 'UTC',
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
        hasCompletedOnboarding: false,
        isFirstLogin: true,
        lastActiveAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(userData);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email.toLowerCase(),
          fullName: userData.fullName,
          passwordHash: userData.passwordHash,
          notificationPreferences: expect.any(String),
        }),
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `User created successfully: ${userData.email} (ID: ${mockUser.id})`,
        'UserPrismaService',
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = 'test-id';
      const updateData = { fullName: 'Updated Name' };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Updated Name',
        phone: null,
        avatarUrl: null,
        passwordHash: 'hashed-password',
        isEmailVerified: false,
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

      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.update(userId, updateData);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
    });
  });

  describe('findMany', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          fullName: 'User One',
          phone: null,
          avatarUrl: null,
          passwordHash: 'hashed-password',
          isEmailVerified: false,
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
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findMany(1, 10);

      expect(result).toEqual({
        users: mockUsers,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateLastActivity', () => {
    it('should update user last activity', async () => {
      const userId = 'test-id';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
        phone: null,
        avatarUrl: null,
        passwordHash: 'hashed-password',
        isEmailVerified: false,
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
        lastActiveAt: new Date(),
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updateLastActivity(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastActiveAt: expect.any(Date) },
      });
    });
  });
});