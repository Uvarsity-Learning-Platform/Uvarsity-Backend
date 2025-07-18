import { Controller, Get, HttpCode, HttpStatus, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { V1_ROUTES } from '../config/versioning.config';

/**
 * Performance Monitoring Controller
 * 
 * Provides endpoints for performance metrics and monitoring
 */
@ApiTags('Performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceMonitor: PerformanceMonitorService) {}

  /**
   * Get Prometheus metrics
   * This endpoint can be scraped by Prometheus
   */
  @Get('metrics')
  @Version(V1_ROUTES.version)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get Prometheus metrics',
    description: 'Returns performance metrics in Prometheus format for scraping'
  })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics returned successfully',
    type: String,
  })
  async getMetrics(): Promise<string> {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get performance summary
   * Human-readable performance information
   */
  @Get('summary')
  @Version(V1_ROUTES.version)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get performance summary',
    description: 'Returns human-readable performance information'
  })
  @ApiResponse({
    status: 200,
    description: 'Performance summary returned successfully',
  })
  async getPerformanceSummary() {
    return this.performanceMonitor.getPerformanceSummary();
  }
}