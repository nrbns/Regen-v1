import { type Tab } from './tabsStore';
type SnapshotTab = Pick<Tab, 'id' | 'url' | 'title' | 'appMode' | 'containerId' | 'containerName' | 'containerColor'>;
type SessionSnapshot = {
    updatedAt: number;
    tabCount: number;
    tabs: SnapshotTab[];
    activeId: string | null;
    hash: string;
};
type SessionStore = {
    snapshot: SessionSnapshot | null;
    saveSnapshot: (tabs: Tab[], activeId: string | null) => void;
    clearSnapshot: () => void;
    restoreFromSnapshot: () => Promise<{
        restored: boolean;
        tabCount: number;
    }>;
};
export declare const useSessionStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SessionStore>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SessionStore, SessionStore>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SessionStore) => void) => () => void;
        onFinishHydration: (fn: (state: SessionStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SessionStore, SessionStore>>;
    };
}>;
export {};
