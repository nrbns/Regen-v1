/**
 * Production Hardening & Resilience (Week 10)
 * Enterprise-grade reliability, security, and monitoring
 */

export interface ResilienceConfig {
  retryPolicy: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
  };
  rateLimiting: {
    requestsPerSecond: number;
    burstSize: number;
  };
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export class CircuitBreaker {
  private state = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  private config: ResilienceConfig['circuitBreaker'];

  constructor(config: ResilienceConfig['circuitBreaker']) {
    this.config = config;
  }

  /**
   * Execute with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime.getTime() > this.config.timeout
      ) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.state = CircuitBreakerState.CLOSED;
          this.failureCount = 0;
          this.successCount = 0;
          console.log('[CircuitBreaker] Circuit CLOSED (recovered)');
        }
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = new Date();

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN;
        console.error('[CircuitBreaker] Circuit OPEN (too many failures)');
      }

      throw error;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private config: ResilienceConfig['rateLimiting'];

  constructor(config: ResilienceConfig['rateLimiting']) {
    this.config = config;
    this.tokens = config.burstSize;
    this.lastRefillTime = Date.now();
  }

  /**
   * Check if request allowed
   */
  allowRequest(): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = timePassed * this.config.requestsPerSecond;

    this.tokens = Math.min(
      this.config.burstSize,
      this.tokens + tokensToAdd
    );
    this.lastRefillTime = now;
  }

  getTokenCount(): number {
    this.refillTokens();
    return this.tokens;
  }
}

export class RetryPolicy {
  private config: ResilienceConfig['retryPolicy'];

  constructor(config: ResilienceConfig['retryPolicy']) {
    this.config = config;
  }

  /**
   * Execute with exponential backoff
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (attempt < this.config.maxAttempts) {
          const delay = this.calculateBackoff(attempt);
          console.warn(
            `[RetryPolicy] ${operationName} attempt ${attempt} failed. Retrying in ${delay}ms...`
          );
          await this.sleep(delay);
        } else {
          console.error(`[RetryPolicy] ${operationName} failed after ${this.config.maxAttempts} attempts`);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private calculateBackoff(attempt: number): number {
    const exponential = Math.pow(this.config.backoffMultiplier, attempt - 1);
    const delay = this.config.initialDelayMs * exponential;
    return Math.min(delay, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ProductionHardening {
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private retryPolicy: RetryPolicy;
  private config: ResilienceConfig;

  constructor(config: ResilienceConfig) {
    this.config = config;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.rateLimiter = new RateLimiter(config.rateLimiting);
    this.retryPolicy = new RetryPolicy(config.retryPolicy);
  }

  /**
   * Execute with full resilience stack
   */
  async executeReliably<T>(
    fn: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    if (!this.rateLimiter.allowRequest()) {
      throw new Error('Rate limit exceeded');
    }

    return this.circuitBreaker.execute(() =>
      this.retryPolicy.executeWithRetry(fn, operationName)
    );
  }

  getHealthStatus(): {
    circuitBreaker: CircuitBreakerState;
    rateLimiterTokens: number;
  } {
    return {
      circuitBreaker: this.circuitBreaker.getState(),
      rateLimiterTokens: this.rateLimiter.getTokenCount(),
    };
  }
}

export default ProductionHardening;
