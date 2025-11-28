import toastLib from 'react-hot-toast';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

const sharedStyle = {
  background: '#0f172a',
  color: '#e2e8f0',
  border: '1px solid #1e293b',
  borderRadius: '16px',
  padding: '12px 16px',
  fontSize: '14px',
};

const toastObj = {
  info: (message: string, options?: { duration?: number }) =>
    toastLib(message, {
      icon: 'ℹ️',
      duration: options?.duration ?? 4000,
      style: sharedStyle,
    }),
  success: (message: string, options?: { duration?: number }) =>
    toastLib.success(message, {
      duration: options?.duration ?? 4000,
      style: { ...sharedStyle, color: '#34d399' },
      iconTheme: { primary: '#34d399', secondary: '#0f172a' },
    }),
  error: (message: string, options?: { duration?: number }) =>
    toastLib.error(message, {
      duration: options?.duration ?? 5000,
      style: { ...sharedStyle, color: '#f87171' },
      iconTheme: { primary: '#f87171', secondary: '#0f172a' },
    }),
  warning: (message: string, options?: { duration?: number }) =>
    toastLib(message, {
      icon: '⚠️',
      duration: options?.duration ?? 4000,
      style: { ...sharedStyle, color: '#facc15' },
    }),
  loading: (message: string) =>
    toastLib.loading(message, {
      duration: Infinity,
      style: sharedStyle,
    }),
  dismiss: (toastId?: string) => toastLib.dismiss(toastId),
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) =>
    toastLib.promise(promise, messages, {
      style: sharedStyle,
      success: { style: { color: '#34d399' } },
      error: { style: { color: '#f87171' } },
    }),
};

function toastFn(type: ToastType, message: string): void {
  switch (type) {
    case 'success':
      toastObj.success(message);
      break;
    case 'error':
      toastObj.error(message);
      break;
    case 'warning':
      toastObj.warning(message);
      break;
    default:
      toastObj.info(message);
      break;
  }
}

export const toast = Object.assign(toastFn, toastObj);
