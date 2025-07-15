import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';

/**
 * Unit tests for LoggerService
 * 
 * These tests verify that the logging service functions correctly
 * and handles different log levels appropriately.
 */
describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log messages without throwing errors', () => {
    expect(() => {
      service.log('Test message', 'TestContext');
    }).not.toThrow();
  });

  it('should log errors without throwing exceptions', () => {
    expect(() => {
      service.error('Test error', 'TestContext', 'Test stack trace');
    }).not.toThrow();
  });

  it('should log warnings without throwing exceptions', () => {
    expect(() => {
      service.warn('Test warning', 'TestContext');
    }).not.toThrow();
  });

  it('should handle API request logging', () => {
    expect(() => {
      service.logApiRequest('GET', '/test', 200, 150, 'test-user-agent');
    }).not.toThrow();
  });

  it('should handle auth event logging', () => {
    expect(() => {
      service.logAuthEvent('login', 'user123', 'successful login', '127.0.0.1');
    }).not.toThrow();
  });
});