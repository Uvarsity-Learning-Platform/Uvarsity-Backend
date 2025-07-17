import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Centralized error handling service for the Stellr Academy Backend
 * 
 * This service provides consistent error handling and formatting across all modules.
 * It ensures that:
 * - All errors are properly logged with context
 * - Error responses follow a consistent format
 * - Sensitive information is not exposed to clients
 * - Different error types are handled appropriately
 * - Stack traces are available in development but hidden in production
 */
@Injectable()
export class ErrorHandlerService {
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  constructor(private readonly logger: LoggerService) {}

  /**
   * Handle and format HTTP exceptions
   * Provides consistent error response format for API endpoints
   * 
   * @param error - The error that occurred
   * @param context - Context where the error occurred (controller, service, etc.)
   * @returns Formatted error response
   */
  handleHttpException(error: any, context: string) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    // Handle known HTTP exceptions
    if (error instanceof HttpException) {
      status = error.getStatus();
      const response = error.getResponse();
      
      if (typeof response === 'string') {
        message = response;
        code = this.getErrorCodeFromStatus(status);
      } else if (typeof response === 'object' && response['message']) {
        message = response['message'];
        code = response['error'] || this.getErrorCodeFromStatus(status);
      }
    } else {
      // Handle unknown errors
      message = this.isDevelopment ? error.message : 'An unexpected error occurred';
    }

    // Log the error with context
    this.logger.error(
      `HTTP Error: ${message}`,
      context,
      this.isDevelopment ? error.stack : undefined,
    );

    // Return formatted error response
    return {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        ...(this.isDevelopment && { stack: error.stack }),
      },
    };
  }

  /**
   * Handle database-related errors
   * Converts database errors into user-friendly messages
   * 
   * @param error - Database error
   * @param context - Context where the error occurred
   * @returns Formatted error for HTTP response
   */
  handleDatabaseError(error: any, context: string) {
    let message = 'Database operation failed';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    // Handle common database errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique constraint violation
          message = 'This record already exists';
          status = HttpStatus.CONFLICT;
          break;
        case '23503': // Foreign key constraint violation
          message = 'Referenced record not found';
          status = HttpStatus.BAD_REQUEST;
          break;
        case '23502': // Not null constraint violation
          message = 'Required field is missing';
          status = HttpStatus.BAD_REQUEST;
          break;
        case '42P01': // Table does not exist
          message = 'Resource not found';
          status = HttpStatus.NOT_FOUND;
          break;
        default:
          message = this.isDevelopment ? error.message : 'Database operation failed';
      }
    }

    // Log the database error
    this.logger.error(
      `Database Error: ${message} (Code: ${error.code})`,
      context,
      this.isDevelopment ? error.stack : undefined,
    );

    throw new HttpException(message, status);
  }

  /**
   * Handle validation errors
   * Formats validation errors from class-validator into user-friendly messages
   * 
   * @param validationErrors - Array of validation errors
   * @param context - Context where validation failed
   * @returns Formatted validation error response
   */
  handleValidationErrors(validationErrors: any[], context: string) {
    const formattedErrors = validationErrors.map((error) => ({
      field: error.property,
      value: error.value,
      constraints: Object.values(error.constraints || {}),
    }));

    this.logger.warn(
      `Validation failed: ${formattedErrors.length} errors`,
      context,
    );

    throw new HttpException(
      {
        error: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: formattedErrors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Handle authentication errors
   * Provides consistent handling for auth-related errors
   * 
   * @param error - Authentication error
   * @param context - Context where auth failed
   * @returns Formatted auth error response
   */
  handleAuthError(error: any, context: string) {
    let message = 'Authentication failed';
    let status = HttpStatus.UNAUTHORIZED;

    if (error.message) {
      if (error.message.includes('token')) {
        message = 'Invalid or expired token';
      } else if (error.message.includes('credentials')) {
        message = 'Invalid credentials';
      } else if (error.message.includes('permission')) {
        message = 'Insufficient permissions';
        status = HttpStatus.FORBIDDEN;
      }
    }

    this.logger.warn(`Authentication Error: ${message}`, context);

    throw new HttpException(
      {
        error: 'AUTHENTICATION_FAILED',
        message,
      },
      status,
    );
  }

  /**
   * Handle rate limiting errors
   * Provides consistent handling for rate limit exceeded scenarios
   * 
   * @param context - Context where rate limit was exceeded
   * @param limit - Rate limit that was exceeded
   * @param windowMs - Time window for the rate limit
   */
  handleRateLimitError(context: string, limit: number, windowMs: number) {
    const message = `Too many requests. Limit: ${limit} requests per ${windowMs / 1000} seconds`;
    
    this.logger.warn(`Rate limit exceeded`, context);

    throw new HttpException(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Handle file upload errors
   * Provides consistent handling for file upload related errors
   * 
   * @param error - File upload error
   * @param context - Context where upload failed
   */
  handleFileUploadError(error: any, context: string) {
    let message = 'File upload failed';
    let status = HttpStatus.BAD_REQUEST;

    if (error.message) {
      if (error.message.includes('size')) {
        message = 'File size exceeds the maximum limit';
      } else if (error.message.includes('type')) {
        message = 'File type not supported';
      } else if (error.message.includes('missing')) {
        message = 'No file provided';
      }
    }

    this.logger.error(`File Upload Error: ${message}`, context);

    throw new HttpException(
      {
        error: 'FILE_UPLOAD_FAILED',
        message,
      },
      status,
    );
  }

  /**
   * Get error code based on HTTP status
   * Provides consistent error codes for different HTTP statuses
   * 
   * @param status - HTTP status code
   * @returns Corresponding error code
   */
  private getErrorCodeFromStatus(status: number): string {
    const statusCodeMap = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_FAILED',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[status] || 'UNKNOWN_ERROR';
  }
}