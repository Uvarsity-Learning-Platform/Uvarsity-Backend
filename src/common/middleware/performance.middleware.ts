import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerformanceMonitorService } from '../services/performance-monitor.service';

/**
 * Performance Monitoring Middleware
 * 
 * Tracks HTTP request performance metrics
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  constructor(private readonly performanceMonitor: PerformanceMonitorService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    
    // Record request start time
    req['performanceStart'] = start;
    
    // Hook into response finish to record metrics
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const method = req.method;
      const route = req.route?.path || req.path;
      const statusCode = res.statusCode;
      
      this.performanceMonitor.recordHttpRequest(method, route, statusCode, duration);
    });
    
    next();
  }
}