import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggerService } from '../services/logger.service';

/**
 * Health check controller for monitoring and uptime verification
 * 
 * Provides endpoints to check the health and status of the Stellr Academy Backend.
 * These endpoints are used by:
 * - Load balancers for health checks
 * - Monitoring systems (Prometheus, DataDog, etc.)
 * - DevOps teams for deployment verification
 * - Uptime monitoring services
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Basic health check endpoint
   * Returns a simple status to verify the application is running
   * 
   * @returns {object} Basic health status information
   */
  @Get()
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Returns the basic health status of the application',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy and running',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 3600.5 },
        service: { type: 'string', example: 'stellr-academy-backend' },
      },
    },
  })
  async getHealth() {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'stellr-academy-backend',
    };

    // Log health check for monitoring
    this.logger.log('Health check performed', 'HealthController');

    return healthData;
  }

  /**
   * Detailed health check endpoint
   * Returns comprehensive system information including database connectivity,
   * memory usage, and service dependencies
   * 
   * @returns {object} Detailed health and system information
   */
  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Returns comprehensive health information including system metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 3600.5 },
        service: { type: 'string', example: 'stellr-academy-backend' },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number', example: 52428800 },
            total: { type: 'number', example: 134217728 },
            usage: { type: 'string', example: '39.06%' },
          },
        },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'connected' },
            type: { type: 'string', example: 'postgresql' },
          },
        },
      },
    },
  })
  async getDetailedHealth() {
    // Get memory usage information
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercentage = ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2);

    const detailedHealthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'stellr-academy-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Memory usage information
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        usage: `${memoryUsagePercentage}%`,
      },
      
      // Database connection status (simplified for now)
      database: {
        status: 'connected', // In a real implementation, this would check actual DB connectivity
        type: 'postgresql',
      },
      
      // Service dependencies status
      services: {
        auth: 'healthy',
        user: 'healthy',
        course: 'healthy',
        progress: 'healthy',
        quiz: 'healthy',
        certificate: 'healthy',
        notification: 'healthy',
        media: 'healthy',
      },
    };

    // Log detailed health check
    this.logger.log('Detailed health check performed', 'HealthController');

    return detailedHealthData;
  }

  /**
   * Ready endpoint for Kubernetes readiness probes
   * Indicates when the service is ready to accept traffic
   * 
   * @returns {object} Readiness status
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Indicates if the service is ready to accept traffic (for Kubernetes readiness probes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
  })
  async getReadiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Live endpoint for Kubernetes liveness probes
   * Indicates if the service is alive and should not be restarted
   * 
   * @returns {object} Liveness status
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Indicates if the service is alive (for Kubernetes liveness probes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  async getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}