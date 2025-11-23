import { create } from 'zustand';

type ToastType = 'info' | 'success' | 'error' | 'warning';

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  timestamp: number;
};

type ToastState = {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
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
  show: ({ type, message }) =>
    set(state => ({
      toasts: [
        ...state.toasts,
        {
          id: generateId(),
          type,
          message,
          timestamp: Date.now(),
        },
      ].slice(-4),
    })),
  dismiss: id =>
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    })),
}));

export function showToast(type: ToastType, message: string) {
  useToastStore.getState().show({ type, message });
}
