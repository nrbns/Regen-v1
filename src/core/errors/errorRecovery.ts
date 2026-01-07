/**
 * Error Recovery - Enhanced recovery suggestions and network retry
 * Phase 1, Day 3: Error Handling & Toast System improvements
 */

import { toast } from '../../utils/toast';

export interface RecoveryAction {
  action: 'retry' | 'hibernate' | 'report' | 'reload' | 'clear-cache' | 'offline-mode';
  message: string;
  label: string;
  priority: number; // Higher = more important
}

/**
 * Phase 1, Day 3: Get recovery suggestions based on error type
 */
export function getRecoveryAction(error: Error, _context?: string): RecoveryAction | null {
  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || '';

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch')
  ) {
    return {
      action: 'retry',
      message: 'Network error detected. Would you like to retry?',
      label: 'Retry',
      priority: 10,
    };
  }

  // Memory errors
  if (
    errorMessage.includes('memory') ||
    errorMessage.includes('out of memory') ||
    errorMessage.includes('quotaexceeded') ||
    errorStack.includes('memory')
  ) {
    return {
      action: 'hibernate',
      message: 'Low memory detected. Hibernate inactive tabs?',
      label: 'Hibernate Tabs',
      priority: 9,
    };
  }

  // Storage errors
  if (
    errorMessage.includes('quotaexceeded') ||
    errorMessage.includes('storage') ||
    errorMessage.includes('localstorage')
  ) {
    return {
      action: 'clear-cache',
      message: 'Storage quota exceeded. Clear cache?',
      label: 'Clear Cache',
      priority: 8,
    };
  }

  // Chunk loading errors (code splitting)
  if (
    errorMessage.includes('chunkloaderror') ||
    errorMessage.includes('loading chunk') ||
    errorMessage.includes('failed to load')
  ) {
    return {
      action: 'reload',
      message: 'Failed to load app resources. Reload the app?',
      label: 'Reload App',
      priority: 7,
    };
  }

  // CORS errors
  if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
    return {
      action: 'report',
      message: 'Cross-origin error. This may be a configuration issue.',
      label: 'Report Issue',
      priority: 5,
    };
  }

  // Unknown errors - suggest reporting
  return {
    action: 'report',
    message: 'Unexpected error occurred. Report this issue?',
    label: 'Report Issue',
    priority: 1,
  };
}

/**
 * Phase 1, Day 3: Execute recovery action
 */
export async function executeRecoveryAction(action: RecoveryAction, error: Error): Promise<boolean> {
  switch (action.action) {
    case 'retry':
      toast.info('Retrying...', { duration: 2000 });
      // Return true to indicate retry should happen
      return true;

    case 'hibernate':
      try {
        const { hibernateInactiveTabs } = await import('../tabs/hibernation');
        const count = await hibernateInactiveTabs();
        if (count > 0) {
          toast.success(`${count} tab${count > 1 ? 's' : ''} hibernated to free memory`);
        } else {
          toast.info('No tabs available to hibernate');
        }
        return false;
      } catch {
        toast.error('Failed to hibernate tabs');
        return false;
      }

    case 'clear-cache':
      try {
        if (typeof window !== 'undefined' && window.caches) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          toast.success('Cache cleared successfully');
        }
        // Also clear localStorage if needed
        if (error.message.includes('localstorage')) {
          localStorage.clear();
          toast.info('Local storage cleared');
        }
        return false;
      } catch {
        toast.error('Failed to clear cache');
        return false;
      }

    case 'reload':
      if (confirm(action.message)) {
        window.location.reload();
      }
      return false;

    case 'offline-mode':
      toast.info('Switching to offline mode...');
      // This would trigger offline mode - implementation depends on app architecture
      return false;

    case 'report':
      // Copy error to clipboard for reporting
      try {
        const errorReport = `Error: ${error.message}\nStack: ${error.stack}\nTime: ${new Date().toISOString()}`;
        await navigator.clipboard.writeText(errorReport);
        toast.success('Error details copied to clipboard. You can paste it in a bug report.');
      } catch {
        toast.info('Please copy the error from the console and report it.');
      }
      return false;

    default:
      return false;
  }
}

/**
 * Phase 1, Day 3: Network error handler with retry logic
 */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number) => void;
    context?: string;
  } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onRetry, context: _context } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a network error
      const isNetworkError =
        lastError.message.includes('network') ||
        lastError.message.includes('fetch') ||
        lastError.message.includes('connection') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('failed to fetch');

      if (!isNetworkError || attempt >= maxRetries) {
        // Not a network error or max retries reached
        throw lastError;
      }

      // Network error - retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      if (onRetry) {
        onRetry(attempt + 1);
      } else {
        toast.info(`Retrying... (${attempt + 1}/${maxRetries})`, { duration: 2000 });
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Unknown error');
}

/**
 * Phase 1, Day 3: Check if error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();

  const recoverablePatterns = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'memory',
    'quotaexceeded',
    'chunkloaderror',
  ];

  return recoverablePatterns.some(pattern => errorMessage.includes(pattern));
}

