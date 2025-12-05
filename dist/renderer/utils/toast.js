/**
 * Toast Utility
 * Provides toast notification functions using react-hot-toast
 * Backward compatible with existing code
 */
import toastLib from 'react-hot-toast';
/**
 * Toast utility object with convenience methods
 * Uses react-hot-toast for better UX with animations and positioning
 */
const toastObj = {
    info: (message, options) => {
        return toastLib(message, {
            icon: 'ℹ️',
            duration: options?.duration ?? 4000,
            style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
            },
        });
    },
    success: (message, options) => {
        return toastLib.success(message, {
            duration: options?.duration ?? 4000,
            style: {
                background: '#1e293b',
                color: '#10b981',
                border: '1px solid #334155',
            },
        });
    },
    error: (message, options) => {
        return toastLib.error(message, {
            duration: options?.duration ?? 5000,
            style: {
                background: '#1e293b',
                color: '#ef4444',
                border: '1px solid #334155',
            },
        });
    },
    warning: (message, options) => {
        return toastLib(message, {
            icon: '⚠️',
            duration: options?.duration ?? 4000,
            style: {
                background: '#1e293b',
                color: '#f59e0b',
                border: '1px solid #334155',
            },
        });
    },
    loading: (message) => {
        return toastLib.loading(message, {
            duration: Infinity, // Loading toasts don't auto-dismiss
            style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
            },
        });
    },
    dismiss: (toastId) => {
        if (toastId) {
            toastLib.dismiss(toastId);
        }
        else {
            toastLib.dismiss();
        }
    },
    promise: (promise, messages) => {
        return toastLib.promise(promise, messages, {
            style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
            },
            success: {
                style: {
                    color: '#10b981',
                },
            },
            error: {
                style: {
                    color: '#ef4444',
                },
            },
        });
    },
};
// Create toast function that also has methods
function toastFn(type, message) {
    switch (type) {
        case 'info':
            toastObj.info(message);
            break;
        case 'success':
            toastObj.success(message);
            break;
        case 'error':
            toastObj.error(message);
            break;
        case 'warning':
            toastObj.warning(message);
            break;
    }
}
// Assign methods to function for backward compatibility
export const toast = Object.assign(toastFn, toastObj);
// Re-export react-hot-toast for direct usage if needed
export { toastLib };
