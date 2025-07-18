import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';
import * as promClient from 'prom-client';

/**
 * Performance Monitoring Service for Stellr Academy Backend
 * 
 * This service provides comprehensive performance monitoring:
 * - Prometheus metrics collection
 * - HTTP request/response metrics
 * - Database query performance
 * - Memory and CPU usage tracking
 * - Custom business metrics
 */
@Injectable()
export class PerformanceMonitorService implements OnModuleInit {
  private readonly register: promClient.Registry;
  private httpRequestsTotal: promClient.Counter;
  private httpRequestDuration: promClient.Histogram;
  private databaseQueryDuration: promClient.Histogram;
  private memoryUsage: promClient.Gauge;
  private cpuUsage: promClient.Gauge;
  private activeConnections: promClient.Gauge;
  private isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.isEnabled = this.configService.get<boolean>('ENABLE_METRICS', false);
    this.register = new promClient.Registry();
    
    if (this.isEnabled) {
      this.initializeMetrics();
    }
  }

  async onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('Performance monitoring initialized', 'PerformanceMonitorService');
      this.startResourceMonitoring();
    }
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics() {
    // HTTP request metrics
    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // Database metrics
    this.databaseQueryDuration = new promClient.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    // System metrics
    this.memoryUsage = new promClient.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register],
    });

    this.cpuUsage = new promClient.Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.register],
    });

    this.activeConnections = new promClient.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
      registers: [this.register],
    });

    // Default metrics
    promClient.collectDefaultMetrics({ register: this.register });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    if (!this.isEnabled) return;

    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(queryType: string, table: string, duration: number) {
    if (!this.isEnabled) return;

    this.databaseQueryDuration.labels(queryType, table).observe(duration);
  }

  /**
   * Update active connections count
   */
  updateActiveConnections(type: string, count: number) {
    if (!this.isEnabled) return;

    this.activeConnections.labels(type).set(count);
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring() {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 10000); // Update every 10 seconds
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics() {
    if (!this.isEnabled) return;

    const memoryUsage = process.memoryUsage();
    this.memoryUsage.labels('rss').set(memoryUsage.rss);
    this.memoryUsage.labels('heapTotal').set(memoryUsage.heapTotal);
    this.memoryUsage.labels('heapUsed').set(memoryUsage.heapUsed);
    this.memoryUsage.labels('external').set(memoryUsage.external);

    const cpuUsage = process.cpuUsage();
    this.cpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000); // Convert to percentage
  }

  /**
   * Get metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    if (!this.isEnabled) {
      return 'Metrics are disabled';
    }

    return this.register.metrics();
  }

  /**
   * Create custom counter metric
   */
  createCounter(name: string, help: string, labelNames?: string[]) {
    if (!this.isEnabled) return null;

    return new promClient.Counter({
      name,
      help,
      labelNames,
      registers: [this.register],
    });
  }

  /**
   * Create custom gauge metric
   */
  createGauge(name: string, help: string, labelNames?: string[]) {
    if (!this.isEnabled) return null;

    return new promClient.Gauge({
      name,
      help,
      labelNames,
      registers: [this.register],
    });
  }

  /**
   * Create custom histogram metric
   */
  createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]) {
    if (!this.isEnabled) return null;

    return new promClient.Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.register],
    });
  }

  /**
   * Record custom business metrics
   */
  recordBusinessMetric(metricName: string, value: number, labels?: Record<string, string>) {
    if (!this.isEnabled) return;

    this.logger.log(`Business metric: ${metricName} = ${value}`, 'PerformanceMonitorService');
    
    // Log to external monitoring service if configured
    // This could be integrated with DataDog, New Relic, etc.
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    if (!this.isEnabled) {
      return { message: 'Performance monitoring is disabled' };
    }

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    return {
      uptime: uptime,
      memory: {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        external: this.formatBytes(memoryUsage.external),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}