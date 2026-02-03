/**
 * B3: Circuit Breaker Pattern
 * 
 * Prevents repeated sync attempts when backend is down.
 * After N consecutive failures in a window, stops attempting sync until cooldown.
 * 
 * States:
 * - closed: Normal operation, requests allowed
 * - open: Too many failures, requests blocked (cooldown period)
 * - half_open: Testing if service recovered (single probe allowed)
 */

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Time window in ms for counting failures */
  windowMs: number;
  /** Cooldown period in ms before transitioning from open to half_open */
  cooldownMs: number;
}

export type CircuitState = 'closed' | 'open' | 'half_open';

export class CircuitOpenError extends Error {
  constructor(message: string, public readonly retryAfterMs: number) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private openedAt: number | null = null;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Check if a request can be attempted
   * @returns true if request can proceed, false if circuit is open
   * @throws CircuitOpenError if circuit is open and cooldown not expired
   */
  canAttempt(): boolean {
    const now = Date.now();

    // Reset failure count if window expired
    if (this.lastFailureTime && now - this.lastFailureTime > this.config.windowMs) {
      this.failureCount = 0;
      this.lastFailureTime = null;
    }

    switch (this.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if cooldown expired
        if (this.openedAt && now - this.openedAt > this.config.cooldownMs) {
          // Transition to half_open (allow single probe)
          this.state = 'half_open';
          return true;
        }
        // Still in cooldown
        return false;

      case 'half_open':
        // Allow single probe
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    // Reset on success
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.openedAt = null;
    this.state = 'closed';
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    const now = Date.now();

    // Reset count if window expired
    if (this.lastFailureTime && now - this.lastFailureTime > this.config.windowMs) {
      this.failureCount = 0;
    }

    this.failureCount++;
    this.lastFailureTime = now;

    // Check if threshold exceeded
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.openedAt = now;
    } else if (this.state === 'half_open') {
      // Probe failed, go back to open
      this.state = 'open';
      this.openedAt = now;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get time remaining in cooldown (ms)
   */
  getCooldownRemaining(): number {
    if (this.state !== 'open' || !this.openedAt) {
      return 0;
    }
    const remaining = this.config.cooldownMs - (Date.now() - this.openedAt);
    return Math.max(0, remaining);
  }

  /**
   * Reset circuit breaker (for testing or manual reset)
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.openedAt = null;
  }
}

// B3: Default configuration
const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 consecutive failures
  windowMs: 60000, // 1 minute window
  cooldownMs: 60000, // 1 minute cooldown
};

// Singleton instance (in-memory, resets on app restart)
export const circuitBreaker = new CircuitBreaker(defaultConfig);
