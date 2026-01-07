/**
 * Network Error Handler - Unified network error handling with retry
 * Phase 1, Day 3: Error Handling & Toast System
 */

import { toast } from '../../utils/toast';
import { withNetworkRetry, getRecoveryAction } from './errorRecovery';

export interface NetworkErrorOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
  context?: string;
  onRetry?: (attempt: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Phase 1, Day 3: Handle network errors with automatic retry and user feedback
 */
export async function handleNetworkError<T>(
  fn: () => Promise<T>,
  options: NetworkErrorOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
    context,
    onRetry,
    onError,
  } = options;

  try {
    return await withNetworkRetry(fn, {
      maxRetries,
      retryDelay,
      onRetry: (attempt) => {
        if (showToast) {
          toast.info(`Retrying... (${attempt}/${maxRetries})`, { duration: 2000 });
        }
        onRetry?.(attempt);
      },
      context,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Show error toast
    if (showToast) {
      const recoveryAction = getRecoveryAction(err, context);
      if (recoveryAction) {
        toast.error(`${context || 'Network'} error: ${recoveryAction.message}`, {
          duration: 6000,
        });
      } else {
        toast.error(`${context || 'Network'} error: ${err.message}`, { duration: 5000 });
      }
    }

    // Call error handler
    onError?.(err);

    throw err;
  }
}

/**
 * Phase 1, Day 3: Check if device is online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine ?? true;
}

/**
 * Phase 1, Day 3: Wait for network connection
 */
export function waitForNetwork(timeout = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      resolve(false);
    }, timeout);

    const handleOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      resolve(true);
    };

    window.addEventListener('online', handleOnline);
  });
}

/**
 * Phase 1, Day 3: Fetch with automatic retry and offline detection
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  networkOptions: NetworkErrorOptions = {}
): Promise<Response> {
  // Check if online
  if (!isOnline()) {
    const online = await waitForNetwork();
    if (!online) {
      throw new Error('Device is offline. Please check your internet connection.');
    }
  }

  return handleNetworkError(
    () => fetch(url, options),
    {
      ...networkOptions,
      context: `Fetch ${url}`,
    }
  );
}

