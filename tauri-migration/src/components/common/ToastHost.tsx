import { Toaster } from 'react-hot-toast';

export function ToastHost() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#0f172a',
          color: '#e2e8f0',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '12px 16px',
          fontSize: '14px',
        },
        success: {
          duration: 4000,
          style: {
            color: '#34d399',
          },
          iconTheme: {
            primary: '#34d399',
            secondary: '#0f172a',
          },
        },
        error: {
          duration: 5000,
          style: {
            color: '#f87171',
          },
          iconTheme: {
            primary: '#f87171',
            secondary: '#0f172a',
          },
        },
        loading: {
          duration: Infinity,
        },
      }}
    />
  );
}
