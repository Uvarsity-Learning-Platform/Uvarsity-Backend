import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { LoggerService } from '../../common/services/logger.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let loggerService: LoggerService;

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    fullName: 'Test User',
    isEmailVerified: true,
    status: 'active',
    preferredLanguage: 'en',
    timezone: 'UTC',
    hasCompletedOnboarding: false,
    isFirstLogin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find user by ID successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('test-user-id');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
      });
      expect(loggerService.debug).toHaveBeenCalledWith(
        'User lookup by ID: test-user-id - Found',
        'UserService',
      );
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(loggerService.debug).toHaveBeenCalledWith(
        'User lookup by ID: non-existent-id - Not found',
        'UserService',
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(dbError);

      await expect(service.findById('test-user-id')).rejects.toThrow(
        'Database connection failed',
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to find user by ID: test-user-id',
        'UserService',
        dbError.stack,
      );
    });
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(loggerService.debug).toHaveBeenCalledWith(
        'User lookup by email: test@example.com - Found',
        'UserService',
      );
    });

    it('should return null when user not found by email', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(loggerService.debug).toHaveBeenCalledWith(
        'User lookup by email: nonexistent@example.com - Not found',
        'UserService',
      );
    });

    it('should handle database errors in findByEmail', async () => {
      const dbError = new Error('Database query failed');
      mockRepository.findOne.mockRejectedValue(dbError);

      await expect(service.findByEmail('test@example.com')).rejects.toThrow(
        'Database query failed',
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to find user by email: test@example.com',
        'UserService',
        dbError.stack,
      );
    });

    it('should handle email case sensitivity', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await service.findByEmail('TEST@EXAMPLE.COM');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'TEST@EXAMPLE.COM' },
      });
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        fullName: 'New User',
        passwordHash: 'hashed-password',
      };

      const createdUser = { ...mockUser, ...userData };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect(result).toEqual(createdUser);
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdUser);
      expect(loggerService.log).toHaveBeenCalledWith(
        'New user created: new@example.com',
        'UserService',
      );
    });

    it('should handle database errors during user creation', async () => {
      const userData = { email: 'test@example.com', fullName: 'Test User' };
      const dbError = new Error('Unique constraint violation');

      mockRepository.create.mockReturnValue(userData);
      mockRepository.save.mockRejectedValue(dbError);

      await expect(service.createUser(userData)).rejects.toThrow(
        'Unique constraint violation',
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to create user: test@example.com',
        'UserService',
        dbError.stack,
      );
    });

    it('should create user with partial data', async () => {
      const minimalUserData = {
        email: 'minimal@example.com',
        fullName: 'Minimal User',
      };

      const createdUser = { ...mockUser, ...minimalUserData };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.createUser(minimalUserData);

      expect(result).toEqual(createdUser);
      expect(mockRepository.create).toHaveBeenCalledWith(minimalUserData);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = {
        fullName: 'Updated Name',
        hasCompletedOnboarding: true,
      };
      const updatedUser = { ...mockUser, ...updateData };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      // Mock findById to return updated user
      jest.spyOn(service, 'findById').mockResolvedValue(updatedUser as User);

      const result = await service.updateUser('test-user-id', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockRepository.update).toHaveBeenCalledWith('test-user-id', updateData);
      expect(service.findById).toHaveBeenCalledWith('test-user-id');
      expect(loggerService.log).toHaveBeenCalledWith(
        'User updated: test@example.com',
        'UserService',
      );
    });

    it('should throw error when user not found after update', async () => {
      const updateData = { fullName: 'Updated Name' };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(service, 'findById').mockResolvedValue(null);

      await expect(service.updateUser('test-user-id', updateData)).rejects.toThrow(
        'User not found after update',
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to update user: test-user-id',
        'UserService',
        expect.any(String),
      );
    });

    it('should handle database errors during update', async () => {
      const updateData = { fullName: 'Updated Name' };
      const dbError = new Error('Update failed');

      mockRepository.update.mockRejectedValue(dbError);

      await expect(service.updateUser('test-user-id', updateData)).rejects.toThrow(
        'Update failed',
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to update user: test-user-id',
        'UserService',
        dbError.stack,
      );
    });

    it('should update user preferences', async () => {
      const updateData = {
        notificationPreferences: {
          email: {
            courseUpdates: false,
            reminderNotifications: true,
            achievementAlerts: false,
            weeklyProgress: true,
          },
          sms: {
            reminderNotifications: true,
            urgentUpdates: false,
          },
          push: {
            lessonReminders: false,
            quizAvailable: true,
            achievementUnlocked: true,
          },
        },
      };

      const updatedUser = { ...mockUser, ...updateData };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(service, 'findById').mockResolvedValue(updatedUser as User);

      const result = await service.updateUser('test-user-id', updateData);

      expect(result.notificationPreferences).toEqual(updateData.notificationPreferences);
    });

    it('should update user status', async () => {
      const updateData = { status: 'suspended' as const };
      const updatedUser = { ...mockUser, ...updateData };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(service, 'findById').mockResolvedValue(updatedUser as User);

      const result = await service.updateUser('test-user-id', updateData);

      expect(result.status).toBe('suspended');
    });
  });

  describe('error handling', () => {
    it('should preserve error context in all methods', async () => {
      const dbError = new Error('Connection timeout');

      // Test error preservation in findById
      mockRepository.findOne.mockRejectedValue(dbError);
      await expect(service.findById('test-id')).rejects.toThrow('Connection timeout');

      // Test error preservation in createUser
      mockRepository.save.mockRejectedValue(dbError);
      mockRepository.create.mockReturnValue({});
      await expect(service.createUser({})).rejects.toThrow('Connection timeout');

      // Test error preservation in updateUser
      mockRepository.update.mockRejectedValue(dbError);
      await expect(service.updateUser('test-id', {})).rejects.toThrow('Connection timeout');
    });
  });

  describe('logging behavior', () => {
    it('should log appropriate levels for different operations', async () => {
      // Test debug logging for lookups
      mockRepository.findOne.mockResolvedValue(mockUser);
      await service.findById('test-id');
      expect(loggerService.debug).toHaveBeenCalled();

      // Test info logging for creation
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);
      await service.createUser({ email: 'test@example.com' });
      expect(loggerService.log).toHaveBeenCalled();

      // Test info logging for updates
      mockRepository.update.mockResolvedValue({ affected: 1 });
      jest.spyOn(service, 'findById').mockResolvedValue(mockUser as User);
      await service.updateUser('test-id', { fullName: 'Updated' });
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('User updated'),
        'UserService',
      );
    });
  });
});