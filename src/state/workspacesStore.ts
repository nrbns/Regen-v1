import { create } from 'zustand';

export type Workspace = { id: string; name: string };

type WorkspacesState = {
  items: Workspace[];
  add: (w: Workspace) => void;
}

export const useWorkspacesStore = create<WorkspacesState>((set) => ({
  items: [],
  add: (w) => set((s) => ({ items: [...s.items, w] }))
}));


