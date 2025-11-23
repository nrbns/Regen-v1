/* eslint-env node */
import CircuitBreaker from 'opossum';

export function createCircuit(fn, options = {}) {
  const breaker = new CircuitBreaker(fn, {
    timeout: options.timeout ?? 10_000,
    errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
    resetTimeout: options.resetTimeout ?? 30_000,
    rollingCountTimeout: options.rollingCountTimeout ?? 10_000,
    rollingCountBuckets: options.rollingCountBuckets ?? 10,
  });

  breaker.on('open', () => {
    console.warn('[circuit] open');
  });
  breaker.on('halfOpen', () => {
    console.info('[circuit] half-open');
  });
  breaker.on('close', () => {
    console.info('[circuit] closed');
  });

  return breaker;
}
