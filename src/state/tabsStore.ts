import { create } from 'zustand';

export type Tab = { id: string; title: string; active?: boolean; url?: string; containerId?: string; containerColor?: string; containerName?: string; mode?: 'normal' | 'ghost' | 'private' };

type TabsState = {
  tabs: Tab[];
  activeId: string | null;
  add: (t: Tab) => void;
  setActive: (id: string) => void;
  setAll: (tabs: Tab[]) => void;
  remove: (id: string) => void;
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeId: null,
  add: (t) => set((s) => ({ tabs: [...s.tabs, t], activeId: t.id })),
  setActive: (id) => set({ activeId: id }),
  setAll: (tabs) => set({ tabs, activeId: tabs.find(t=>t.active)?.id || tabs[0]?.id || null }),
  remove: (id) => set(s => ({ tabs: s.tabs.filter(t=>t.id !== id), activeId: s.activeId === id ? (s.tabs.find(t=>t.id !== id)?.id || null) : s.activeId }))
}));


