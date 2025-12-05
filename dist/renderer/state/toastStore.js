import { create } from 'zustand';
const generateId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
};
export const useToastStore = create(set => ({
    toasts: [],
    show: ({ type, message }, options) => set(state => {
        const id = generateId();
        const toast = {
            id,
            type,
            message,
            timestamp: Date.now(),
            duration: options?.duration,
        };
        // Auto-dismiss if duration is set (and not 0)
        if (options?.duration && options.duration > 0) {
            setTimeout(() => {
                useToastStore.getState().dismiss(id);
            }, options.duration);
        }
        return {
            toasts: [...state.toasts, toast].slice(-4),
        };
    }),
    dismiss: id => set(state => ({
        toasts: state.toasts.filter(toast => toast.id !== id),
    })),
}));
export function showToast(type, message, options) {
    useToastStore.getState().show({ type, message }, options);
}
