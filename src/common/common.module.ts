import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { LoggerService } from './services/logger.service';
import { ErrorHandlerService } from './services/error-handler.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ProcessMonitorService } from './services/process-monitor.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

/**
 * Common module for shared utilities and cross-cutting concerns
 * 
 * This module provides shared functionality used across all microservices:
 * 
 * 🏥 Health checks and monitoring endpoints
 * 📝 Centralized logging service
 * ⚠️ Global error handling and formatting
 * 🔄 Circuit breaker pattern for resilience
 * 🖥️ Process monitoring and graceful shutdown
 * 🛡️ Security utilities and helpers
 * 🔧 Common validators and transformers
 * 📊 Metrics and monitoring utilities
 */
@Module({
  controllers: [
    HealthController, // Health check endpoints for monitoring
  ],
  providers: [
    LoggerService,           // Centralized logging service
    ErrorHandlerService,     // Global error handling
    CircuitBreakerService,   // Circuit breaker for resilience
    ProcessMonitorService,   // Process monitoring and graceful shutdown
  ],
  exports: [
    LoggerService,           // Make logger available to other modules
    ErrorHandlerService,     // Make error handler available to other modules
    CircuitBreakerService,   // Make circuit breaker available to other modules
    ProcessMonitorService,   // Make process monitor available to other modules
  ],
})
export class CommonModule {
  /**
   * Common module constructor
   * Initializes shared services and utilities
   */
  constructor() {
    console.log('🛠️ Common utilities and services initialized');
  }
}