import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Circuit Breaker State Enum
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back up
}

/**
 * Circuit Breaker Configuration Interface
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  successThreshold: number;    // Number of successes before closing
  timeout: number;            // Timeout before attempting half-open
  monitoringPeriod: number;   // Window for counting failures
}

/**
 * Circuit Breaker Statistics Interface
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  halfOpenAttempts: number;
}

/**
 * Circuit Breaker Service for Stellr Academy Backend
 * 
 * Implements the Circuit Breaker pattern to prevent cascading failures
 * and improve system resilience. This service:
 * 
 * - Monitors service call success/failure rates
 * - Opens circuit when failure threshold is exceeded
 * - Provides fast-fail responses when circuit is open
 * - Automatically attempts recovery with half-open state
 * - Logs circuit state changes for monitoring
 * 
 * Use this for external service calls like:
 * - Database operations
 * - Email service calls
 * - File upload services
 * - Third-party API integrations
 */
@Injectable()
export class CircuitBreakerService {
  private circuits: Map<string, CircuitBreakerStats> = new Map();
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,      // Open after 5 failures
    successThreshold: 3,      // Close after 3 successes
    timeout: 60000,          // 1 minute timeout
    monitoringPeriod: 60000, // 1 minute monitoring window
  };

  constructor(private readonly logger: LoggerService) {}

  /**
   * Execute a function with circuit breaker protection
   * 
   * @param circuitName - Unique name for this circuit
   * @param operation - The operation to execute
   * @param config - Optional circuit configuration
   * @returns Promise with operation result
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const stats = this.getOrCreateCircuitStats(circuitName);

    // Check if circuit should be opened based on failure rate
    this.updateCircuitState(circuitName, finalConfig, stats);

    if (stats.state === CircuitState.OPEN) {
      const timeSinceLastFailure = stats.lastFailureTime 
        ? Date.now() - stats.lastFailureTime.getTime()
        : Infinity;

      if (timeSinceLastFailure < finalConfig.timeout) {
        this.logger.warn(
          `Circuit breaker ${circuitName} is OPEN - failing fast`,
          'CircuitBreakerService',
        );
        throw new Error(`Service ${circuitName} is currently unavailable`);
      } else {
        // Transition to half-open state
        stats.state = CircuitState.HALF_OPEN;
        stats.halfOpenAttempts = 0;
        this.logger.log(
          `Circuit breaker ${circuitName} transitioning to HALF_OPEN`,
          'CircuitBreakerService',
        );
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(circuitName, finalConfig);
      return result;
    } catch (error) {
      this.recordFailure(circuitName, finalConfig, error);
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   * 
   * @param circuitName - Name of the circuit
   * @returns Circuit statistics
   */
  getCircuitStats(circuitName: string): CircuitBreakerStats | undefined {
    return this.circuits.get(circuitName);
  }

  /**
   * Get all circuit breaker statistics
   * 
   * @returns Map of all circuit statistics
   */
  getAllCircuitStats(): Map<string, CircuitBreakerStats> {
    return new Map(this.circuits);
  }

  /**
   * Reset a specific circuit breaker
   * 
   * @param circuitName - Name of the circuit to reset
   */
  resetCircuit(circuitName: string): void {
    if (this.circuits.has(circuitName)) {
      const stats = this.circuits.get(circuitName)!;
      stats.state = CircuitState.CLOSED;
      stats.failures = 0;
      stats.successes = 0;
      stats.halfOpenAttempts = 0;
      stats.lastFailureTime = undefined;
      stats.lastSuccessTime = new Date();

      this.logger.log(
        `Circuit breaker ${circuitName} has been reset`,
        'CircuitBreakerService',
      );
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuits(): void {
    const circuitNames = Array.from(this.circuits.keys());
    circuitNames.forEach(name => this.resetCircuit(name));
    
    this.logger.log(
      `All circuit breakers have been reset (${circuitNames.length} circuits)`,
      'CircuitBreakerService',
    );
  }

  /**
   * Get or create circuit statistics for a named circuit
   */
  private getOrCreateCircuitStats(circuitName: string): CircuitBreakerStats {
    if (!this.circuits.has(circuitName)) {
      this.circuits.set(circuitName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        halfOpenAttempts: 0,
      });
    }
    return this.circuits.get(circuitName)!;
  }

  /**
   * Update circuit state based on current statistics
   */
  private updateCircuitState(
    circuitName: string,
    config: CircuitBreakerConfig,
    stats: CircuitBreakerStats,
  ): void {
    if (stats.state === CircuitState.CLOSED && stats.failures >= config.failureThreshold) {
      stats.state = CircuitState.OPEN;
      this.logger.error(
        `Circuit breaker ${circuitName} OPENED due to ${stats.failures} failures`,
        'CircuitBreakerService',
      );
    } else if (stats.state === CircuitState.HALF_OPEN && stats.successes >= config.successThreshold) {
      stats.state = CircuitState.CLOSED;
      stats.failures = 0; // Reset failure count
      this.logger.log(
        `Circuit breaker ${circuitName} CLOSED after ${stats.successes} successes`,
        'CircuitBreakerService',
      );
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(circuitName: string, config: CircuitBreakerConfig): void {
    const stats = this.circuits.get(circuitName)!;
    stats.successes++;
    stats.lastSuccessTime = new Date();

    if (stats.state === CircuitState.HALF_OPEN) {
      stats.halfOpenAttempts++;
    }

    this.logger.debug(
      `Circuit breaker ${circuitName} recorded success (${stats.successes} total)`,
      'CircuitBreakerService',
    );

    this.updateCircuitState(circuitName, config, stats);
  }

  /**
   * Record a failed operation
   */
  private recordFailure(circuitName: string, config: CircuitBreakerConfig, error: any): void {
    const stats = this.circuits.get(circuitName)!;
    stats.failures++;
    stats.lastFailureTime = new Date();

    if (stats.state === CircuitState.HALF_OPEN) {
      // If we fail in half-open, go back to open
      stats.state = CircuitState.OPEN;
      stats.halfOpenAttempts = 0;
    }

    this.logger.error(
      `Circuit breaker ${circuitName} recorded failure (${stats.failures} total): ${error.message}`,
      'CircuitBreakerService',
    );

    this.updateCircuitState(circuitName, config, stats);
  }
}