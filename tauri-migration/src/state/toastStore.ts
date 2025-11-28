import toastLib from 'react-hot-toast';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

const baseStyle = {
  background: '#0f172a',
  color: '#e2e8f0',
  border: '1px solid #1e293b',
  borderRadius: '16px',
  padding: '12px 16px',
  fontSize: '14px',
};

export function showToast(type: ToastType, message: string) {
  switch (type) {
    case 'success':
      toastLib.success(message, {
        style: { ...baseStyle, color: '#34d399' },
        iconTheme: { primary: '#34d399', secondary: baseStyle.background ?? '#0f172a' },
      });
      break;
    case 'error':
      toastLib.error(message, {
        style: { ...baseStyle, color: '#f87171' },
        iconTheme: { primary: '#f87171', secondary: baseStyle.background ?? '#0f172a' },
      });
      break;
    case 'warning':
      toastLib(message, {
        icon: '⚠️',
        style: { ...baseStyle, color: '#facc15' },
      });
      break;
    default:
      toastLib(message, {
        icon: 'ℹ️',
        style: baseStyle,
      });
      break;
  }
}

export function showLoadingToast(message: string) {
  return toastLib.loading(message, {
    style: baseStyle,
  });
}

export function dismissToast(id?: string) {
  toastLib.dismiss(id);
}
