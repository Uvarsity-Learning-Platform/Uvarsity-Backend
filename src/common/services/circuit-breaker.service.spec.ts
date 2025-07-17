import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService, CircuitState } from './circuit-breaker.service';
import { LoggerService } from './logger.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let logger: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
    logger = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.resetAllCircuits();
  });

  describe('execute', () => {
    it('should execute operation successfully in CLOSED state', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await service.execute('test-circuit', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      
      const stats = service.getCircuitStats('test-circuit');
      expect(stats?.state).toBe(CircuitState.CLOSED);
      expect(stats?.successes).toBe(1);
      expect(stats?.failures).toBe(0);
    });

    it('should record failures and open circuit after threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const circuitName = 'failure-circuit';
      
      // Execute 5 failures to reach threshold
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(circuitName, operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      const stats = service.getCircuitStats(circuitName);
      expect(stats?.state).toBe(CircuitState.OPEN);
      expect(stats?.failures).toBe(5);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('OPENED due to 5 failures'),
        'CircuitBreakerService',
      );
    });

    it('should fail fast when circuit is OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const circuitName = 'open-circuit';
      
      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(circuitName, operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Now circuit should be open, next call should fail fast
      await expect(service.execute(circuitName, operation)).rejects.toThrow(
        'Service open-circuit is currently unavailable',
      );
      
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('is OPEN - failing fast'),
        'CircuitBreakerService',
      );
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');
      
      const circuitName = 'timeout-circuit';
      const config = { failureThreshold: 5, timeout: 100 }; // 100ms timeout
      
      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(circuitName, operation, config);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Next call should transition to HALF_OPEN and succeed
      const result = await service.execute(circuitName, operation, config);
      expect(result).toBe('success');
      
      const stats = service.getCircuitStats(circuitName);
      expect(stats?.state).toBe(CircuitState.HALF_OPEN);
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      const operation = jest.fn();
      const circuitName = 'close-circuit';
      const config = { 
        failureThreshold: 5, 
        successThreshold: 3, 
        timeout: 100 
      };
      
      // Open the circuit by causing failures
      operation.mockRejectedValue(new Error('Fail'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(circuitName, operation, config);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Verify circuit is open
      let stats = service.getCircuitStats(circuitName);
      expect(stats?.state).toBe(CircuitState.OPEN);
      
      // Wait for timeout to allow HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Execute successful operations to close circuit
      operation.mockResolvedValue('success');
      
      // First success transitions to HALF_OPEN
      await service.execute(circuitName, operation, config);
      stats = service.getCircuitStats(circuitName);
      expect(stats?.state).toBe(CircuitState.HALF_OPEN);
      
      // Continue with successful operations to reach success threshold
      for (let i = 1; i < 3; i++) {
        await service.execute(circuitName, operation, config);
      }
      
      stats = service.getCircuitStats(circuitName);
      expect(stats?.state).toBe(CircuitState.CLOSED);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('CLOSED after 3 successes'),
        'CircuitBreakerService',
      );
    });

    it('should use custom configuration', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const circuitName = 'custom-config-circuit';
      const customConfig = {
        failureThreshold: 2, // Lower threshold
        successThreshold: 1,
        timeout: 50,
        monitoringPeriod: 30000,
      };
      
      // Should open after only 2 failures with custom config
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute(circuitName, operation, customConfig);
        } catch (error) {
          // Expected to fail
        }
      }
      
      const stats = service.getCircuitStats(circuitName);
      expect(stats?.state).toBe(CircuitState.OPEN);
      expect(stats?.failures).toBe(2);
    });

    it('should handle operation errors properly', async () => {
      const error = new Error('Custom operation error');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(service.execute('error-circuit', operation)).rejects.toThrow(
        'Custom operation error',
      );
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('recorded failure'),
        'CircuitBreakerService',
      );
    });
  });

  describe('getCircuitStats', () => {
    it('should return undefined for non-existent circuit', () => {
      const stats = service.getCircuitStats('non-existent');
      expect(stats).toBeUndefined();
    });

    it('should return correct stats for existing circuit', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      await service.execute('stats-circuit', operation);
      
      const stats = service.getCircuitStats('stats-circuit');
      expect(stats).toBeDefined();
      expect(stats?.state).toBe(CircuitState.CLOSED);
      expect(stats?.successes).toBe(1);
      expect(stats?.failures).toBe(0);
    });
  });

  describe('getAllCircuitStats', () => {
    it('should return all circuit statistics', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await service.execute('circuit1', operation);
      await service.execute('circuit2', operation);
      
      const allStats = service.getAllCircuitStats();
      expect(allStats.size).toBe(2);
      expect(allStats.has('circuit1')).toBe(true);
      expect(allStats.has('circuit2')).toBe(true);
    });

    it('should return empty map when no circuits exist', () => {
      const allStats = service.getAllCircuitStats();
      expect(allStats.size).toBe(0);
    });
  });

  describe('resetCircuit', () => {
    it('should reset specific circuit to initial state', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));
      const circuitName = 'reset-circuit';
      
      // Create some failures
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute(circuitName, operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Reset the circuit
      service.resetCircuit(circuitName);
      
      const stats = service.getCircuitStats(circuitName);
      expect(stats?.state).toBe(CircuitState.CLOSED);
      expect(stats?.failures).toBe(0);
      expect(stats?.successes).toBe(0);
      expect(stats?.halfOpenAttempts).toBe(0);
      
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('has been reset'),
        'CircuitBreakerService',
      );
    });

    it('should handle reset of non-existent circuit gracefully', () => {
      expect(() => service.resetCircuit('non-existent')).not.toThrow();
    });
  });

  describe('resetAllCircuits', () => {
    it('should reset all circuits', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));
      
      // Create multiple circuits with failures
      await Promise.allSettled([
        service.execute('circuit1', operation),
        service.execute('circuit2', operation),
        service.execute('circuit3', operation),
      ]);
      
      service.resetAllCircuits();
      
      const allStats = service.getAllCircuitStats();
      allStats.forEach(stats => {
        expect(stats.state).toBe(CircuitState.CLOSED);
        expect(stats.failures).toBe(0);
        expect(stats.successes).toBe(0);
      });
      
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('All circuit breakers have been reset (3 circuits)'),
        'CircuitBreakerService',
      );
    });
  });

  describe('logging behavior', () => {
    it('should log debug messages for successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await service.execute('debug-circuit', operation);
      
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('recorded success'),
        'CircuitBreakerService',
      );
    });

    it('should log error messages for failed operations', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await service.execute('error-circuit', operation);
      } catch (error) {
        // Expected to fail
      }
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('recorded failure'),
        'CircuitBreakerService',
      );
    });

    it('should log state transitions', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));
      const circuitName = 'transition-circuit';
      
      // Trigger circuit to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(circuitName, operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('OPENED due to'),
        'CircuitBreakerService',
      );
    });
  });
});