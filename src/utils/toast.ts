/**
 * Toast Utility
 * Provides toast notification functions using react-hot-toast
 * Backward compatible with existing code
 */

import toastLib from 'react-hot-toast';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

/**
 * Toast utility object with convenience methods
 * Uses react-hot-toast for better UX with animations and positioning
 */
const toastObj = {
  info: (message: string, options?: { duration?: number }) => {
    return toastLib(message, {
      icon: 'ℹ️',
      duration: options?.duration ?? 4000,
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #334155',
      },
    });
  },
  success: (message: string, options?: { duration?: number }) => {
    return toastLib.success(message, {
      duration: options?.duration ?? 4000,
      style: {
        background: '#1e293b',
        color: '#10b981',
        border: '1px solid #334155',
      },
    });
  },
  error: (message: string, options?: { duration?: number }) => {
    return toastLib.error(message, {
      duration: options?.duration ?? 5000,
      style: {
        background: '#1e293b',
        color: '#ef4444',
        border: '1px solid #334155',
      },
    });
  },
  warning: (message: string, options?: { duration?: number }) => {
    return toastLib(message, {
      icon: '⚠️',
      duration: options?.duration ?? 4000,
      style: {
        background: '#1e293b',
        color: '#f59e0b',
        border: '1px solid #334155',
      },
    });
  },
  loading: (message: string) => {
    return toastLib.loading(message, {
      duration: Infinity, // Loading toasts don't auto-dismiss
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #334155',
      },
    });
  },
  dismiss: (toastId?: string) => {
    if (toastId) {
      toastLib.dismiss(toastId);
    } else {
      toastLib.dismiss();
    }
  },
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: {
      retry?: boolean;
      maxRetries?: number;
    }
  ) => {
    // Phase 1, Day 3: Enhanced promise toast with retry support
    const promiseWithRetry = options?.retry
      ? (async () => {
          const { withNetworkRetry } = await import('../core/errors/errorRecovery');
          return withNetworkRetry(() => promise, {
            maxRetries: options.maxRetries || 3,
            context: messages.loading,
          });
        })()
      : promise;

    return toastLib.promise(promiseWithRetry, messages, {
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #334155',
      },
      success: {
        style: {
          color: '#10b981',
        },
      },
      error: {
        style: {
          color: '#ef4444',
        },
      },
    });
  },
};

// Create toast function that also has methods
function toastFn(type: ToastType, message: string): void {
  switch (type) {
    case 'info':
      toastObj.info(message);
      break;
    case 'success':
      toastObj.success(message);
      break;
    case 'error':
      toastObj.error(message);
      break;
    case 'warning':
      toastObj.warning(message);
      break;
  }
}

// Assign methods to function for backward compatibility
export const toast = Object.assign(toastFn, toastObj);

// Re-export react-hot-toast for direct usage if needed
export { toastLib };
