import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Process Health Interface
 */
export interface ProcessHealth {
  pid: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

/**
 * Shutdown Handler Interface
 */
export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
  timeout?: number;
}

/**
 * Process Monitor Service for Stellr Academy Backend
 * 
 * This service provides:
 * - Graceful shutdown handling
 * - Process health monitoring
 * - Memory and CPU usage tracking
 * - Shutdown hooks for cleanup
 * - Process recovery and restart coordination
 * 
 * Features:
 * - Registers shutdown handlers for different signals
 * - Coordinates cleanup across all services
 * - Monitors resource usage
 * - Provides health check data
 * - Prevents data loss during shutdown
 */
@Injectable()
export class ProcessMonitorService implements OnApplicationShutdown {
  private shutdownHandlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private startTime = Date.now();
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthCheck?: ProcessHealth;

  constructor(private readonly logger: LoggerService) {
    this.setupProcessListeners();
    this.startHealthMonitoring();
  }

  /**
   * Register a cleanup handler for graceful shutdown
   * 
   * @param name - Descriptive name for the handler
   * @param handler - Async function to execute during shutdown
   * @param timeout - Maximum time to wait for handler completion (default: 5000ms)
   */
  registerShutdownHandler(name: string, handler: () => Promise<void>, timeout = 5000): void {
    this.shutdownHandlers.push({ name, handler, timeout });
    this.logger.debug(
      `Registered shutdown handler: ${name} (timeout: ${timeout}ms)`,
      'ProcessMonitorService',
    );
  }

  /**
   * Get current process health information
   * 
   * @returns Current process health data
   */
  getProcessHealth(): ProcessHealth {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      pid: process.pid,
      uptime: Date.now() - this.startTime,
      memoryUsage,
      cpuUsage,
      timestamp: new Date(),
    };
  }

  /**
   * Get the last recorded health check
   * 
   * @returns Last health check data or undefined
   */
  getLastHealthCheck(): ProcessHealth | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Check if the process is currently shutting down
   * 
   * @returns true if shutdown is in progress
   */
  isProcessShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get process uptime in milliseconds
   * 
   * @returns Process uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get memory usage statistics
   * 
   * @returns Formatted memory usage information
   */
  getMemoryStats(): {
    used: string;
    total: string;
    percentage: string;
    heap: { used: string; total: string };
  } {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memUsage.rss;

    return {
      used: this.formatBytes(usedMemory),
      total: this.formatBytes(totalMemory),
      percentage: ((usedMemory / totalMemory) * 100).toFixed(2) + '%',
      heap: {
        used: this.formatBytes(memUsage.heapUsed),
        total: this.formatBytes(memUsage.heapTotal),
      },
    };
  }

  /**
   * Force a graceful shutdown
   * 
   * @param reason - Reason for shutdown
   */
  async forceShutdown(reason: string): Promise<void> {
    this.logger.warn(`Forcing graceful shutdown: ${reason}`, 'ProcessMonitorService');
    await this.handleShutdown('SIGTERM');
  }

  /**
   * Setup process event listeners for graceful shutdown
   */
  private setupProcessListeners(): void {
    // Handle different termination signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const;
    
    signals.forEach(signal => {
      process.on(signal, () => {
        this.logger.log(`Received ${signal} signal`, 'ProcessMonitorService');
        this.handleShutdown(signal);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error(
        `Uncaught Exception: ${error.message}`,
        'ProcessMonitorService',
        error.stack,
      );
      
      // Attempt graceful shutdown on uncaught exception
      this.handleShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error(
        `Unhandled Rejection at: ${promise}, reason: ${reason}`,
        'ProcessMonitorService',
      );
    });

    this.logger.log(
      `Process listeners setup for PID ${process.pid}`,
      'ProcessMonitorService',
    );
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.lastHealthCheck = this.getProcessHealth();
      
      // Log health warnings if memory usage is high
      const memStats = this.getMemoryStats();
      const memPercentage = parseFloat(memStats.percentage.replace('%', ''));
      
      if (memPercentage > 80) {
        this.logger.warn(
          `High memory usage detected: ${memStats.percentage} (${memStats.used})`,
          'ProcessMonitorService',
        );
      }
    }, 30000); // Check every 30 seconds

    this.logger.debug('Health monitoring started', 'ProcessMonitorService');
  }

  /**
   * Handle graceful shutdown process
   */
  private async handleShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress, ignoring signal', 'ProcessMonitorService');
      return;
    }

    this.isShuttingDown = true;
    this.logger.log(`Starting graceful shutdown (${signal})`, 'ProcessMonitorService');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Execute all registered shutdown handlers
    const shutdownPromises = this.shutdownHandlers.map(async (handler) => {
      try {
        this.logger.debug(`Executing shutdown handler: ${handler.name}`, 'ProcessMonitorService');
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Shutdown handler '${handler.name}' timed out`));
          }, handler.timeout || 5000);
        });

        // Race between handler and timeout
        await Promise.race([handler.handler(), timeoutPromise]);
        
        this.logger.debug(`Shutdown handler '${handler.name}' completed`, 'ProcessMonitorService');
      } catch (error) {
        this.logger.error(
          `Shutdown handler '${handler.name}' failed: ${error.message}`,
          'ProcessMonitorService',
          error.stack,
        );
      }
    });

    // Wait for all handlers to complete (or timeout)
    try {
      await Promise.allSettled(shutdownPromises);
      this.logger.log('All shutdown handlers completed', 'ProcessMonitorService');
    } catch (error) {
      this.logger.error(
        `Error during shutdown handlers execution: ${error.message}`,
        'ProcessMonitorService',
      );
    }

    this.logger.log('Graceful shutdown completed', 'ProcessMonitorService');
    
    // Exit the process
    process.exit(0);
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * NestJS lifecycle hook for application shutdown
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Application shutdown hook called with signal: ${signal}`, 'ProcessMonitorService');
    await this.handleShutdown(signal || 'ApplicationShutdown');
  }
}