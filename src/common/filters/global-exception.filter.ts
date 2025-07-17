import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorHandlerService } from '../services/error-handler.service';
import { LoggerService } from '../services/logger.service';

/**
 * Global Exception Filter for Stellr Academy Backend
 * 
 * This filter catches all unhandled exceptions throughout the application
 * and provides consistent error responses while preventing server crashes.
 * 
 * Features:
 * - Catches all HTTP and non-HTTP exceptions
 * - Provides consistent error response format
 * - Logs errors with proper context and stack traces
 * - Prevents sensitive information leakage
 * - Maintains application stability
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract request context for logging
    const requestContext = {
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent'),
      ip: request.ip || request.connection.remoteAddress,
      userId: (request as any).user?.id,
    };

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse;

    try {
      if (exception instanceof HttpException) {
        // Handle known HTTP exceptions
        status = exception.getStatus();
        errorResponse = this.errorHandler.handleHttpException(
          exception,
          'GlobalExceptionFilter',
        );
      } else if (this.isDatabaseError(exception)) {
        // Handle database errors
        try {
          this.errorHandler.handleDatabaseError(exception, 'GlobalExceptionFilter');
        } catch (dbError) {
          if (dbError instanceof HttpException) {
            status = dbError.getStatus();
            errorResponse = this.errorHandler.handleHttpException(
              dbError,
              'GlobalExceptionFilter',
            );
          }
        }
      } else {
        // Handle unknown exceptions
        this.logger.error(
          `Unhandled exception: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
          'GlobalExceptionFilter',
          exception instanceof Error ? exception.stack : undefined,
        );

        errorResponse = {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Log the complete request context for debugging
      this.logger.error(
        `Request failed: ${requestContext.method} ${requestContext.url}`,
        'GlobalExceptionFilter',
        JSON.stringify({
          exception: exception instanceof Error ? exception.message : 'Unknown',
          requestContext,
          statusCode: status,
        }),
      );

      // Send error response
      response.status(status).json(errorResponse);

    } catch (filterError) {
      // Fallback error handling if the filter itself fails
      this.logger.error(
        `Exception filter failed: ${filterError instanceof Error ? filterError.message : 'Unknown filter error'}`,
        'GlobalExceptionFilter',
        filterError instanceof Error ? filterError.stack : undefined,
      );

      // Send minimal error response to prevent complete failure
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: 'FILTER_ERROR',
          message: 'Error handling failed',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Check if the exception is a database-related error
   * @param exception - The exception to check
   * @returns true if it's a database error
   */
  private isDatabaseError(exception: unknown): boolean {
    if (typeof exception === 'object' && exception !== null) {
      const error = exception as any;
      // Check for common database error indicators
      return !!(
        error.code || // PostgreSQL error codes
        error.errno || // MySQL error numbers
        error.sqlState || // SQL state codes
        (error.name && (
          error.name.includes('QueryFailedError') ||
          error.name.includes('DatabaseError') ||
          error.name.includes('ConnectionError')
        ))
      );
    }
    return false;
  }
}