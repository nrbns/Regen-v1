/**
 * Toast Component
 * Non-blocking notification system
 */
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
export declare function Toast({ toast, onDismiss }: ToastProps): import("react/jsx-runtime").JSX.Element;
export interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}
export declare function ToastContainer({ toasts, onDismiss, position }: ToastContainerProps): import("react/jsx-runtime").JSX.Element;
