export declare const TAB_GROUP_COLORS: string[];
export type TabHistoryEntry = {
    url: string;
    title?: string;
    timestamp: number;
};
export type Tab = {
    id: string;
    title: string;
    active?: boolean;
    url?: string;
    containerId?: string;
    containerColor?: string;
    containerName?: string;
    mode?: 'normal' | 'ghost' | 'private';
    appMode?: 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
    createdAt?: number;
    lastActiveAt?: number;
    sessionId?: string;
    profileId?: string;
    sleeping?: boolean;
    pinned?: boolean;
    groupId?: string;
    history?: TabHistoryEntry[];
    historyIndex?: number;
};
export type TabGroup = {
    id: string;
    name: string;
    color: string;
    collapsed?: boolean;
    createdAt: number;
};
export type ClosedTab = {
    closedId: string;
    title?: string;
    url?: string;
    appMode?: Tab['appMode'];
    mode?: Tab['mode'];
    containerId?: string;
    containerName?: string;
    containerColor?: string;
    groupId?: string;
    closedAt: number;
};
type TabsState = {
    tabs: Tab[];
    activeId: string | null;
    recentlyClosed: ClosedTab[];
    tabGroups: TabGroup[];
    add: (t: Tab) => void;
    setActive: (id: string | null) => void;
    setAll: (tabs: Tab[]) => void;
    remove: (id: string) => void;
    getTabsForMode: (mode: string) => Tab[];
    updateTab: (id: string, updates: Partial<Tab>) => void;
    rememberClosedTab: (tab: Tab) => void;
    popRecentlyClosed: () => ClosedTab | undefined;
    removeRecentlyClosed: (closedId: string) => void;
    pushRecentlyClosed: (entry: ClosedTab) => void;
    clearRecentlyClosed: () => void;
    pinTab: (id: string) => void;
    unpinTab: (id: string) => void;
    togglePinTab: (id: string) => void;
    createGroup: (options?: {
        name?: string;
        color?: string;
    }) => TabGroup;
    updateGroup: (id: string, updates: Partial<TabGroup>) => void;
    deleteGroup: (id: string) => void;
    toggleGroupCollapsed: (id: string) => void;
    setGroupColor: (id: string, color: string) => void;
    assignTabToGroup: (tabId: string, groupId: string | null) => void;
    navigateTab: (tabId: string, newUrl: string) => void;
    goBack: (tabId: string) => void;
    goForward: (tabId: string) => void;
    canGoBack: (tabId: string) => boolean;
    canGoForward: (tabId: string) => boolean;
    canAddTab: () => boolean;
    getTabCount: () => number;
    getMaxTabs: () => number;
};
export declare const useTabsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<TabsState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<TabsState, {
            tabs: Tab[];
            activeId: string | null;
            recentlyClosed: ClosedTab[];
            tabGroups: TabGroup[];
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: TabsState) => void) => () => void;
        onFinishHydration: (fn: (state: TabsState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<TabsState, {
            tabs: Tab[];
            activeId: string | null;
            recentlyClosed: ClosedTab[];
            tabGroups: TabGroup[];
        }>>;
    };
}>;
export {};
