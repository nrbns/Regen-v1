import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useToastStore } from '../../state/toastStore';

const toastIcon = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
} as const;

export function ToastHost() {
  const { toasts, dismiss } = useToastStore();

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map(toast => setTimeout(() => dismiss(toast.id), 4000));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[2000] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map(toast => {
          const Icon = toastIcon[toast.type];
          const palette =
            toast.type === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-50'
              : toast.type === 'error'
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-50'
                : 'border-slate-400/40 bg-slate-800/80 text-slate-100';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-black/40 ${palette}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="text-sm leading-snug">{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
