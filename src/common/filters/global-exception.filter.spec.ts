import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ErrorHandlerService } from '../services/error-handler.service';
import { LoggerService } from '../services/logger.service';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let errorHandler: ErrorHandlerService;
  let logger: LoggerService;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock request object
    mockRequest = {
      method: 'GET',
      url: '/test',
      get: jest.fn().mockReturnValue('test-user-agent'),
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      user: { id: 'test-user-id' },
    };

    // Mock ArgumentsHost
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: ErrorHandlerService,
          useValue: {
            handleHttpException: jest.fn(),
            handleDatabaseError: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    errorHandler = module.get<ErrorHandlerService>(ErrorHandlerService);
    logger = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle HttpException correctly', () => {
      const httpException = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Test error',
          timestamp: expect.any(String),
        },
      };

      (errorHandler.handleHttpException as jest.Mock).mockReturnValue(mockErrorResponse);

      filter.catch(httpException, mockHost);

      expect(errorHandler.handleHttpException).toHaveBeenCalledWith(
        httpException,
        'GlobalExceptionFilter',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse);
      expect(logger.error).toHaveBeenCalledWith(
        'Request failed: GET /test',
        'GlobalExceptionFilter',
        expect.stringContaining('Test error'),
      );
    });

    it('should handle database errors correctly', () => {
      const dbError = { code: '23505', message: 'duplicate key' };
      const convertedHttpException = new HttpException('This record already exists', HttpStatus.CONFLICT);
      const mockErrorResponse = {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'This record already exists',
          timestamp: expect.any(String),
        },
      };

      (errorHandler.handleDatabaseError as jest.Mock).mockImplementation(() => {
        throw convertedHttpException;
      });
      (errorHandler.handleHttpException as jest.Mock).mockReturnValue(mockErrorResponse);

      filter.catch(dbError, mockHost);

      expect(errorHandler.handleDatabaseError).toHaveBeenCalledWith(
        dbError,
        'GlobalExceptionFilter',
      );
      expect(errorHandler.handleHttpException).toHaveBeenCalledWith(
        convertedHttpException,
        'GlobalExceptionFilter',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse);
    });

    it('should handle unknown exceptions', () => {
      const unknownError = new Error('Unknown error');

      filter.catch(unknownError, mockHost);

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled exception: Unknown error',
        'GlobalExceptionFilter',
        unknownError.stack,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle non-Error exceptions', () => {
      const nonErrorException = 'String exception';

      filter.catch(nonErrorException, mockHost);

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled exception: Unknown error',
        'GlobalExceptionFilter',
        undefined,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should provide fallback error handling if filter fails', () => {
      const httpException = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      
      // Make errorHandler.handleHttpException throw an error
      (errorHandler.handleHttpException as jest.Mock).mockImplementation(() => {
        throw new Error('Handler error');
      });

      filter.catch(httpException, mockHost);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Exception filter failed'),
        'GlobalExceptionFilter',
        expect.any(String),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILTER_ERROR',
          message: 'Error handling failed',
          timestamp: expect.any(String),
        },
      });
    });

    it('should extract request context correctly', () => {
      const httpException = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const mockErrorResponse = { success: false, error: {} };

      (errorHandler.handleHttpException as jest.Mock).mockReturnValue(mockErrorResponse);

      filter.catch(httpException, mockHost);

      expect(logger.error).toHaveBeenCalledWith(
        'Request failed: GET /test',
        'GlobalExceptionFilter',
        expect.stringContaining('test-user-id'),
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        'GlobalExceptionFilter',
        expect.stringContaining('127.0.0.1'),
      );
    });

    it('should handle request without user context', () => {
      const httpException = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const mockErrorResponse = { success: false, error: {} };

      // Remove user from request
      delete mockRequest.user;
      (errorHandler.handleHttpException as jest.Mock).mockReturnValue(mockErrorResponse);

      filter.catch(httpException, mockHost);

      // Check that the log was called without checking the exact JSON structure
      expect(logger.error).toHaveBeenCalledWith(
        'Request failed: GET /test',
        'GlobalExceptionFilter',
        expect.any(String),
      );
      
      // Verify the logged data doesn't include a userId
      const loggedData = (logger.error as jest.Mock).mock.calls.find(
        call => call[0] === 'Request failed: GET /test'
      )[2];
      const parsedData = JSON.parse(loggedData);
      expect(parsedData.requestContext.userId).toBeUndefined();
    });
  });

  describe('isDatabaseError', () => {
    it('should identify PostgreSQL errors', () => {
      const pgError = { code: '23505' };
      const result = (filter as any).isDatabaseError(pgError);
      expect(result).toBe(true);
    });

    it('should identify MySQL errors', () => {
      const mysqlError = { errno: 1062 };
      const result = (filter as any).isDatabaseError(mysqlError);
      expect(result).toBe(true);
    });

    it('should identify TypeORM errors', () => {
      const typeormError = { name: 'QueryFailedError' };
      const result = (filter as any).isDatabaseError(typeormError);
      expect(result).toBe(true);
    });

    it('should not identify non-database errors', () => {
      const regularError = new Error('Regular error');
      const result = (filter as any).isDatabaseError(regularError);
      expect(result).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect((filter as any).isDatabaseError(null)).toBe(false);
      expect((filter as any).isDatabaseError(undefined)).toBe(false);
    });
  });
});