import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorHandlerService } from './error-handler.service';
import { LoggerService } from './logger.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorHandlerService,
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleHttpException', () => {
    it('should handle HttpException properly', () => {
      const httpException = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const result = service.handleHttpException(httpException, 'TestContext');

      expect(result).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Test error',
          timestamp: expect.any(String),
          stack: expect.any(String),
        },
      });

      expect(loggerService.error).toHaveBeenCalledWith(
        'HTTP Error: Test error',
        'TestContext',
        expect.any(String),
      );
    });

    it('should handle HttpException with object response', () => {
      const httpException = new HttpException(
        { message: 'Custom error', error: 'CUSTOM_ERROR' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      const result = service.handleHttpException(httpException, 'TestContext');

      expect(result.error.code).toBe('CUSTOM_ERROR');
      expect(result.error.message).toBe('Custom error');
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const result = service.handleHttpException(unknownError, 'TestContext');

      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toBe('Unknown error');
    });

    it('should sanitize error messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Create a new instance to test production behavior
      const prodService = new ErrorHandlerService(loggerService);
      const unknownError = new Error('Sensitive information');
      const result = prodService.handleHttpException(unknownError, 'TestContext');

      expect(result.error.message).toBe('An unexpected error occurred');
      expect(result.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle unique constraint violation', () => {
      const dbError = { code: '23505', message: 'duplicate key value', stack: 'error stack trace' };

      expect(() => service.handleDatabaseError(dbError, 'TestContext')).toThrow(
        new HttpException('This record already exists', HttpStatus.CONFLICT),
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Database Error: This record already exists (Code: 23505)',
        'TestContext',
        expect.any(String),
      );
    });

    it('should handle foreign key constraint violation', () => {
      const dbError = { code: '23503', message: 'foreign key constraint', stack: 'error stack trace' };

      expect(() => service.handleDatabaseError(dbError, 'TestContext')).toThrow(
        new HttpException('Referenced record not found', HttpStatus.BAD_REQUEST),
      );
    });

    it('should handle not null constraint violation', () => {
      const dbError = { code: '23502', message: 'null value constraint', stack: 'error stack trace' };

      expect(() => service.handleDatabaseError(dbError, 'TestContext')).toThrow(
        new HttpException('Required field is missing', HttpStatus.BAD_REQUEST),
      );
    });

    it('should handle table not found error', () => {
      const dbError = { code: '42P01', message: 'relation does not exist', stack: 'error stack trace' };

      expect(() => service.handleDatabaseError(dbError, 'TestContext')).toThrow(
        new HttpException('Resource not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should handle unknown database errors', () => {
      const dbError = { code: 'UNKNOWN', message: 'Unknown database error', stack: 'error stack trace' };

      expect(() => service.handleDatabaseError(dbError, 'TestContext')).toThrow(
        new HttpException('Unknown database error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('handleValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const validationErrors = [
        {
          property: 'email',
          value: 'invalid-email',
          constraints: {
            isEmail: 'email must be a valid email',
          },
        },
        {
          property: 'password',
          value: '123',
          constraints: {
            minLength: 'password must be longer than 8 characters',
          },
        },
      ];

      expect(() => service.handleValidationErrors(validationErrors, 'TestContext')).toThrow(
        HttpException,
      );

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Validation failed: 2 errors',
        'TestContext',
      );
    });
  });

  describe('handleAuthError', () => {
    it('should handle token-related auth errors', () => {
      const authError = new Error('Invalid token');

      expect(() => service.handleAuthError(authError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'AUTHENTICATION_FAILED',
            message: 'Invalid or expired token',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should handle credential-related auth errors', () => {
      const authError = new Error('Invalid credentials');

      expect(() => service.handleAuthError(authError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'AUTHENTICATION_FAILED',
            message: 'Invalid credentials',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should handle permission-related auth errors', () => {
      const authError = new Error('Insufficient permission');

      expect(() => service.handleAuthError(authError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'AUTHENTICATION_FAILED',
            message: 'Insufficient permissions',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
    });

    it('should handle generic auth errors', () => {
      const authError = new Error('Generic auth error');

      expect(() => service.handleAuthError(authError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });

  describe('handleRateLimitError', () => {
    it('should handle rate limit exceeded errors', () => {
      expect(() => service.handleRateLimitError('TestContext', 100, 60000)).toThrow(
        new HttpException(
          {
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Limit: 100 requests per 60 seconds',
            retryAfter: 60,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      expect(loggerService.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        'TestContext',
      );
    });
  });

  describe('handleFileUploadError', () => {
    it('should handle file size errors', () => {
      const fileError = new Error('File size exceeds limit');

      expect(() => service.handleFileUploadError(fileError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'FILE_UPLOAD_FAILED',
            message: 'File size exceeds the maximum limit',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should handle file type errors', () => {
      const fileError = new Error('File type not supported');

      expect(() => service.handleFileUploadError(fileError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'FILE_UPLOAD_FAILED',
            message: 'File type not supported',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should handle missing file errors', () => {
      const fileError = new Error('File missing');

      expect(() => service.handleFileUploadError(fileError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'FILE_UPLOAD_FAILED',
            message: 'No file provided',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should handle generic file upload errors', () => {
      const fileError = new Error('Generic file error');

      expect(() => service.handleFileUploadError(fileError, 'TestContext')).toThrow(
        new HttpException(
          {
            error: 'FILE_UPLOAD_FAILED',
            message: 'File upload failed',
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });
});