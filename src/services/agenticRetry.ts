/**
 * Automatic retry logic for transient errors
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    'network',
    'timeout',
    'connection',
    'temporary',
    'rate limit',
    'server error',
    '503',
    '502',
    '504',
    '429',
  ],
};

/**
 * Check if an error is transient and retryable
 */
export function isRetryableError(error: string | Error): boolean {
  const errorStr = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();

  // Check against known retryable error patterns
  const retryablePatterns = DEFAULT_OPTIONS.retryableErrors;
  return retryablePatterns.some(pattern => errorStr.includes(pattern));
}

/**
 * Check if an error is permanent (should not retry)
 */
export function isPermanentError(error: string | Error): boolean {
  const errorStr = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();

  const permanentPatterns = [
    'invalid',
    'not found',
    '404',
    '403',
    '401',
    'forbidden',
    'unauthorized',
    'permission denied',
    'bad request',
    '400',
  ];

  return permanentPatterns.some(pattern => errorStr.includes(pattern));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | string = 'Unknown error';
  let delay = opts.retryDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : String(error);

      // Don't retry on permanent errors
      if (isPermanentError(lastError)) {
        throw lastError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= opts.maxRetries) {
        throw lastError;
      }

      // Only retry if error is retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= opts.backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Retry an action execution with automatic retry logic
 */
export async function retryAction<T>(
  actionFn: () => Promise<T>,
  _actionName: string,
  _onRetry?: (attempt: number, maxRetries: number) => void
): Promise<T> {
  return retryWithBackoff(
    async () => {
      try {
        return await actionFn();
      } catch (error) {
        const errorStr = error instanceof Error ? error.message : String(error);

        // Check if it's a retryable error
        if (isRetryableError(errorStr) && !isPermanentError(errorStr)) {
          throw error; // Will be caught by retryWithBackoff
        }

        // Permanent error, don't retry
        throw error;
      }
    },
    {
      maxRetries: 2, // Fewer retries for user-facing actions
      retryDelay: 500,
      backoffMultiplier: 1.5,
    }
  );
}
