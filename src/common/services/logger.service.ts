import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('server.nodeEnv');
    
    this.logger = winston.createLogger({
      level: nodeEnv === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.colorize({ all: nodeEnv !== 'production' }),
      ),
      defaultMeta: { service: 'stellr-backend' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });

    // Add file transport for production
    if (nodeEnv === 'production') {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
      );
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
      );
    }
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  logRequest(req: any, res: any, responseTime: number) {
    const { method, url, ip, headers } = req;
    const { statusCode } = res;
    
    this.logger.info('HTTP Request', {
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      statusCode,
      responseTime: `${responseTime}ms`,
    });
  }

  logDatabaseQuery(query: string, duration: number, context?: string) {
    this.logger.debug('Database Query', {
      query,
      duration: `${duration}ms`,
      context,
    });
  }

  logSecurityEvent(event: string, details: any, context?: string) {
    this.logger.warn('Security Event', {
      event,
      details,
      context,
    });
  }
}
