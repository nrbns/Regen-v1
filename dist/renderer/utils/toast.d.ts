/**
 * Toast Utility
 * Provides toast notification functions using react-hot-toast
 * Backward compatible with existing code
 */
import toastLib from 'react-hot-toast';
export type ToastType = 'info' | 'success' | 'error' | 'warning';
declare function toastFn(type: ToastType, message: string): void;
export declare const toast: typeof toastFn & {
    info: (message: string, options?: {
        duration?: number;
    }) => string;
    success: (message: string, options?: {
        duration?: number;
    }) => string;
    error: (message: string, options?: {
        duration?: number;
    }) => string;
    warning: (message: string, options?: {
        duration?: number;
    }) => string;
    loading: (message: string) => string;
    dismiss: (toastId?: string) => void;
    promise: <T>(promise: Promise<T>, messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: Error) => string);
    }, options?: {
        retry?: boolean;
        maxRetries?: number;
    }) => Promise<T>;
};
export { toastLib };
