/**
 * Workspaces Store - Tier 2
 * Manages saved workspaces (collections of tabs)
 */
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
export declare const useWorkspacesStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<WorkspacesState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<WorkspacesState, WorkspacesState>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: WorkspacesState) => void) => () => void;
        onFinishHydration: (fn: (state: WorkspacesState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<WorkspacesState, WorkspacesState>>;
    };
}>;
export {};
