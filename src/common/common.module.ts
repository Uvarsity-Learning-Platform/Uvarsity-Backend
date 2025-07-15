import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { LoggerService } from './services/logger.service';
import { ErrorHandlerService } from './services/error-handler.service';

/**
 * Common module for shared utilities and cross-cutting concerns
 * 
 * This module provides shared functionality used across all microservices:
 * 
 * 🏥 Health checks and monitoring endpoints
 * 📝 Centralized logging service
 * ⚠️ Global error handling and formatting
 * 🛡️ Security utilities and helpers
 * 🔧 Common validators and transformers
 * 📊 Metrics and monitoring utilities
 */
@Module({
  controllers: [
    HealthController, // Health check endpoints for monitoring
  ],
  providers: [
    LoggerService,        // Centralized logging service
    ErrorHandlerService,  // Global error handling
  ],
  exports: [
    LoggerService,        // Make logger available to other modules
    ErrorHandlerService,  // Make error handler available to other modules
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