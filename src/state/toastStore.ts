import { create } from 'zustand';

type ToastType = 'info' | 'success' | 'error' | 'warning';

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  timestamp: number;
  duration?: number; // Optional duration (0 = persistent)
};

type ToastState = {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id' | 'timestamp'>, options?: { duration?: number }) => void;
  dismiss: (id: string) => void;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const useToastStore = create<ToastState>(set => ({
  toasts: [],
  show: ({ type, message }, options) =>
    set(state => {
      const id = generateId();
      const toast: ToastItem = {
        id,
        type,
        message,
        timestamp: Date.now(),
        duration: options?.duration,
      };

      // Auto-dismiss if duration is set (and not 0)
      if (options?.duration && options.duration > 0) {
        setTimeout(() => {
          useToastStore.getState().dismiss(id);
        }, options.duration);
      }

      return {
        toasts: [...state.toasts, toast].slice(-4),
      };
    }),
  dismiss: id =>
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    })),
}));

export function showToast(type: ToastType, message: string, options?: { duration?: number }) {
  useToastStore.getState().show({ type, message }, options);
}
