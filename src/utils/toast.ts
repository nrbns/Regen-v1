/**
 * Toast Utility
 * Provides toast notification functions for compatibility
 */

import {
  showToast as showToastFromStore,
  useToastStore,
  type ToastItem,
} from '../state/toastStore';

export type Toast = ToastItem;
export type ToastType = 'info' | 'success' | 'error' | 'warning';

/**
 * Toast utility object with convenience methods
 */
const toastObj = {
  info: (message: string) => showToastFromStore('info', message),
  success: (message: string) => showToastFromStore('success', message),
  error: (message: string) => showToastFromStore('error', message),
  warning: (message: string) => showToastFromStore('warning', message),
};

// Create toast function that also has methods
function toastFn(type: ToastType, message: string): void {
  showToastFromStore(type, message);
}

// Assign methods to function
export const toast = Object.assign(toastFn, toastObj);

/**
 * Toast manager for subscription-based updates
 */
export const toastManager = {
  subscribe: (callback: (toast: Toast) => void) => {
    const unsubscribe = useToastStore.subscribe(state => {
      const latestToast = state.toasts[state.toasts.length - 1];
      if (latestToast) {
        callback(latestToast);
      }
    });
    return unsubscribe;
  },
  getState: () => useToastStore.getState(),
};
