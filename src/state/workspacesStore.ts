/**
 * Workspaces Store - Tier 2
 * Manages saved workspaces (collections of tabs)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab } from './tabsStore';

export type Workspace = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tabs: Tab[];
  mode: 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
  isPinned?: boolean;
  description?: string;
};

type WorkspacesState = {
  workspaces: Workspace[];
  add: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => string;
  remove: (id: string) => void;
  update: (id: string, updates: Partial<Workspace>) => void;
  get: (id: string) => Workspace | undefined;
  search: (query: string) => Workspace[];
  togglePin: (id: string) => void;
  clear: () => void;
};

export const useWorkspacesStore = create<WorkspacesState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      add: workspace => {
        const now = Date.now();
        const newWorkspace: Workspace = {
          ...workspace,
          id: `workspace-${now}-${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        set(state => ({
          workspaces: [...state.workspaces, newWorkspace],
        }));
        return newWorkspace.id;
      },
      remove: id =>
        set(state => ({
          workspaces: state.workspaces.filter(w => w.id !== id),
        })),
      update: (id, updates) =>
        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w
          ),
        })),
      get: id => {
        return get().workspaces.find(w => w.id === id);
      },
      search: query => {
        const lowerQuery = query.toLowerCase();
        return get().workspaces.filter(
          w =>
            w.name.toLowerCase().includes(lowerQuery) ||
            w.description?.toLowerCase().includes(lowerQuery)
        );
      },
      togglePin: id =>
        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === id ? { ...w, isPinned: !w.isPinned } : w
          ),
        })),
      clear: () => set({ workspaces: [] }),
    }),
    {
      name: 'omnibrowser_workspaces_v1',
    }
  )
);
