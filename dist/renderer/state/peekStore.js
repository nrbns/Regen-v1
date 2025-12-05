import { create } from 'zustand';
export const usePeekPreviewStore = create((set, get) => ({
    visible: false,
    tab: null,
    open: (tab) => set({ visible: true, tab }),
    close: () => set({ visible: false, tab: null }),
    sync: (tab) => {
        const current = get().tab;
        if (current?.id === tab.id) {
            set({ tab: { ...current, ...tab } });
        }
    },
}));
