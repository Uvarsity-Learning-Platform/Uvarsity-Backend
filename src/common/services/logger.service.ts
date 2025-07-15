import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

/**
 * Centralized logging service for the Stellr Academy Backend
 * 
 * This service provides structured logging throughout the application with:
 * - Different log levels (error, warn, log, debug, verbose)
 * - Contextual information for easier debugging
 * - Timestamp formatting
 * - Environment-aware logging (more verbose in development)
 * - Integration with external logging services (future enhancement)
 * 
 * Usage examples:
 * - this.logger.log('User registered successfully', 'AuthService')
 * - this.logger.error('Database connection failed', 'DatabaseModule', error.stack)
 * - this.logger.warn('Rate limit approaching', 'AuthController')
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  /**
   * Log general information messages
   * Use for normal application flow and important business events
   * 
   * @param message - The message to log
   * @param context - The context/component where the log originated (e.g., 'AuthService')
   */
  log(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    console.log(`${timestamp} LOG ${contextStr} ${message}`);
  }

  /**
   * Log error messages
   * Use for exceptions and critical issues that need immediate attention
   * 
   * @param message - The error message
   * @param context - The context/component where the error occurred
   * @param trace - Stack trace or additional error details
   */
  error(message: string, context?: string, trace?: string) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    console.error(`${timestamp} ERROR ${contextStr} ${message}`);
    
    if (trace) {
      console.error(trace);
    }

    // In production, you might want to send errors to external services
    // like Sentry, DataDog, or CloudWatch
    if (!this.isDevelopment) {
      // TODO: Send to external error tracking service
    }
  }

  /**
   * Log warning messages
   * Use for potentially harmful situations that don't stop the application
   * 
   * @param message - The warning message
   * @param context - The context/component where the warning occurred
   */
  warn(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    console.warn(`${timestamp} WARN ${contextStr} ${message}`);
  }

  /**
   * Log debug messages
   * Use for detailed information that is only useful when diagnosing problems
   * Only logs in development environment by default
   * 
   * @param message - The debug message
   * @param context - The context/component where the debug log originated
   */
  debug(message: string, context?: string) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString();
      const contextStr = context ? `[${context}]` : '';
      console.debug(`${timestamp} DEBUG ${contextStr} ${message}`);
    }
  }

  /**
   * Log verbose messages
   * Use for very detailed information, typically only useful for debugging
   * Only logs in development environment
   * 
   * @param message - The verbose message
   * @param context - The context/component where the verbose log originated
   */
  verbose(message: string, context?: string) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString();
      const contextStr = context ? `[${context}]` : '';
      console.log(`${timestamp} VERBOSE ${contextStr} ${message}`);
    }
  }

  /**
   * Log API requests for monitoring and debugging
   * Useful for tracking API usage and performance
   * 
   * @param method - HTTP method (GET, POST, etc.)
   * @param url - Request URL
   * @param statusCode - Response status code
   * @param responseTime - Response time in milliseconds
   * @param userAgent - User agent string (optional)
   */
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
  ) {
    const timestamp = new Date().toISOString();
    const userAgentStr = userAgent ? `UA: ${userAgent}` : '';
    
    console.log(
      `${timestamp} API [${method}] ${url} ${statusCode} ${responseTime}ms ${userAgentStr}`,
    );
  }

  /**
   * Log authentication events for security monitoring
   * Important for tracking login attempts, token usage, etc.
   * 
   * @param event - Type of auth event (login, logout, token_refresh, etc.)
   * @param userId - User ID involved in the event
   * @param details - Additional details about the event
   * @param ipAddress - IP address where the event originated
   */
  logAuthEvent(event: string, userId?: string, details?: string, ipAddress?: string) {
    const timestamp = new Date().toISOString();
    const userStr = userId ? `User: ${userId}` : 'User: anonymous';
    const ipStr = ipAddress ? `IP: ${ipAddress}` : '';
    const detailsStr = details ? `Details: ${details}` : '';
    
    console.log(`${timestamp} AUTH [${event}] ${userStr} ${ipStr} ${detailsStr}`);
  }

  /**
   * Log database operations for performance monitoring
   * Useful for tracking slow queries and database usage
   * 
   * @param operation - Type of database operation (SELECT, INSERT, UPDATE, DELETE)
   * @param table - Database table involved
   * @param executionTime - Query execution time in milliseconds
   * @param recordCount - Number of records affected (optional)
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    executionTime: number,
    recordCount?: number,
  ) {
    const timestamp = new Date().toISOString();
    const recordStr = recordCount !== undefined ? `Records: ${recordCount}` : '';
    
    console.log(
      `${timestamp} DB [${operation}] ${table} ${executionTime}ms ${recordStr}`,
    );
  }
}