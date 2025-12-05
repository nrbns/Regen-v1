type ToastType = 'info' | 'success' | 'error' | 'warning';
export type ToastItem = {
    id: string;
    type: ToastType;
    message: string;
    timestamp: number;
    duration?: number;
};
type ToastState = {
    toasts: ToastItem[];
    show: (toast: Omit<ToastItem, 'id' | 'timestamp'>, options?: {
        duration?: number;
    }) => void;
    dismiss: (id: string) => void;
};
export declare const useToastStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ToastState>>;
export declare function showToast(type: ToastType, message: string, options?: {
    duration?: number;
}): void;
export {};
