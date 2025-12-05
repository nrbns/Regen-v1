import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Toast Component
 * Non-blocking notification system
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { useTokens } from '../useTokens';
const iconMap = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
};
const colorMap = {
    success: 'text-[var(--color-success)]',
    error: 'text-[var(--color-error)]',
    warning: 'text-[var(--color-warning)]',
    info: 'text-[var(--color-info)]',
};
export function Toast({ toast, onDismiss }) {
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
    return (_jsxs(motion.div, { initial: { opacity: 0, y: -20, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }, className: `
        flex items-start gap-3 p-4 rounded-lg
        bg-[var(--surface-panel)] border border-[var(--surface-border)]
        shadow-lg min-w-[300px] max-w-[500px]
      `, role: "alert", "aria-live": "polite", children: [_jsx(Icon, { size: 20, className: `flex-shrink-0 ${colorMap[toast.type || 'info']}` }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-[var(--text-primary)]", style: { fontSize: tokens.fontSize.sm }, children: toast.message }), toast.action && (_jsx("button", { onClick: toast.action.onClick, className: "mt-2 text-[var(--color-primary-500)] hover:text-[var(--color-primary-400)] font-medium", style: { fontSize: tokens.fontSize.xs }, children: toast.action.label }))] }), _jsx("button", { onClick: () => onDismiss(toast.id), className: "flex-shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors", "aria-label": "Dismiss", children: _jsx(X, { size: 16 }) })] }));
}
export function ToastContainer({ toasts, onDismiss, position = 'top-right' }) {
    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
    };
    return (_jsx("div", { className: `fixed ${positionClasses[position]} z-[100] flex flex-col gap-2 pointer-events-none`, "aria-live": "polite", "aria-label": "Notifications", children: _jsx(AnimatePresence, { children: toasts.map(toast => (_jsx("div", { className: "pointer-events-auto", children: _jsx(Toast, { toast: toast, onDismiss: onDismiss }) }, toast.id))) }) }));
}
