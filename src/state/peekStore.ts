import { create } from 'zustand';
import type { Tab } from './tabsStore';

type PeekState = {
  visible: boolean;
  tab: Tab | null;
  open: (tab: Tab) => void;
  close: () => void;
  sync: (tab: Tab) => void;
};

export const usePeekPreviewStore = create<PeekState>((set, get) => ({
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

