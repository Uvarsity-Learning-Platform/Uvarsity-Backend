import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { LoggerService } from '../services/logger.service';

/**
 * Unit tests for HealthController
 * 
 * These tests verify that health check endpoints return
 * the expected data structure and status information.
 */
describe('HealthController', () => {
  let controller: HealthController;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [LoggerService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return basic health information', async () => {
      const result = await controller.getHealth();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('service', 'stellr-academy-backend');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health information', async () => {
      const result = await controller.getDetailedHealth();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('services');
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('usage');
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status', async () => {
      const result = await controller.getReadiness();

      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status', async () => {
      const result = await controller.getLiveness();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
    });
  });
});