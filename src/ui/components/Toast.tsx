/**
 * Toast Component
 * Non-blocking notification system
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { useTokens } from '../useTokens';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const iconMap: Record<ToastType, React.ComponentType<any>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap: Record<ToastType, string> = {
  success: 'text-[var(--color-success)]',
  error: 'text-[var(--color-error)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-info)]',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const tokens = useTokens();
  const Icon = iconMap[toast.type || 'info'];

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      className={`
        flex items-start gap-3 p-4 rounded-lg
        bg-[var(--surface-panel)] border border-[var(--surface-border)]
        shadow-lg min-w-[300px] max-w-[500px]
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon size={20} className={`flex-shrink-0 ${colorMap[toast.type || 'info']}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text-primary)]" style={{ fontSize: tokens.fontSize.sm }}>
          {toast.message}
        </p>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-[var(--color-primary-500)] hover:text-[var(--color-primary-400)] font-medium"
            style={{ fontSize: tokens.fontSize.xs }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastContainer({ toasts, onDismiss, position = 'top-right' }: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[100] flex flex-col gap-2 pointer-events-none`}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
