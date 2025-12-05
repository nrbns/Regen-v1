/**
 * Workspaces Store - Tier 2
 * Manages saved workspaces (collections of tabs)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useWorkspacesStore = create()(persist((set, get) => ({
    workspaces: [],
    add: workspace => {
        const now = Date.now();
        const newWorkspace = {
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
    remove: id => set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
    })),
    update: (id, updates) => set(state => ({
        workspaces: state.workspaces.map(w => w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w),
    })),
    get: id => {
        return get().workspaces.find(w => w.id === id);
    },
    search: query => {
        const lowerQuery = query.toLowerCase();
        return get().workspaces.filter(w => w.name.toLowerCase().includes(lowerQuery) ||
            w.description?.toLowerCase().includes(lowerQuery));
    },
    togglePin: id => set(state => ({
        workspaces: state.workspaces.map(w => w.id === id ? { ...w, isPinned: !w.isPinned } : w),
    })),
    clear: () => set({ workspaces: [] }),
}), {
    name: 'regen_workspaces_v1',
}));
