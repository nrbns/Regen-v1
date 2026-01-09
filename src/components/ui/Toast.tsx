import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastComponent({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-600/20 border-green-500/50 text-green-300',
    error: 'bg-red-600/20 border-red-500/50 text-red-300',
    warning: 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300',
    info: 'bg-blue-600/20 border-blue-500/50 text-blue-300',
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg border backdrop-blur-sm ${colors[toast.type]} shadow-lg min-w-[300px] max-w-[500px]`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const handleToast = (e: CustomEvent<Toast>) => {
      const toast: Toast = {
        id: `toast_${Date.now()}_${Math.random()}`,
        ...e.detail,
      };
      setToasts(prev => [...prev, toast]);
    };

    window.addEventListener('regen:toast', handleToast as EventListener);
    return () => window.removeEventListener('regen:toast', handleToast as EventListener);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastComponent toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function showToast(message: string, type: ToastType = 'info', duration?: number) {
  const event = new CustomEvent<Toast>('regen:toast', {
    detail: { message, type, duration },
  });
  window.dispatchEvent(event);
}