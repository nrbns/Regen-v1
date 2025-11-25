/**
 * ToastHost - Renders toast notifications using react-hot-toast
 * Provides better UX with animations, positioning, and loading states
 */

import { Toaster } from 'react-hot-toast';

export function ToastHost() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1e293b',
          color: '#e2e8f0',
          border: '1px solid #334155',
          borderRadius: '0.75rem',
          padding: '12px 16px',
          fontSize: '14px',
          maxWidth: '400px',
        },
        success: {
          duration: 4000,
          style: {
            color: '#10b981',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#1e293b',
          },
        },
        error: {
          duration: 5000,
          style: {
            color: '#ef4444',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#1e293b',
          },
        },
        loading: {
          duration: Infinity,
          style: {
            color: '#e2e8f0',
          },
        },
      }}
    />
  );
}
