export type TabGraphNode = {
    id: string;
    title: string;
    url: string;
    domain: string;
    containerId?: string;
    containerName?: string;
    containerColor?: string;
    mode?: 'normal' | 'ghost' | 'private';
    active: boolean;
    createdAt?: number;
    lastActiveAt?: number;
};
export type TabGraphEdge = {
    id: string;
    source: string;
    target: string;
    weight: number;
    reasons: string[];
};
export type TabGraphSummary = {
    totalTabs: number;
    activeTabs: number;
    domains: number;
    containers: number;
};
export type TabGraphData = {
    nodes: TabGraphNode[];
    edges: TabGraphEdge[];
    summary: TabGraphSummary;
    updatedAt: number;
    clusters?: Array<{
        id: string;
        label: string;
        tabIds: string[];
        domain?: string;
        strength: number;
    }>;
};
interface TabGraphState {
    visible: boolean;
    loading: boolean;
    error: string | null;
    data: TabGraphData | null;
    focusedTabId: string | null;
    open: () => Promise<void>;
    close: () => void;
    toggle: () => Promise<void>;
    refresh: () => Promise<void>;
    setFocusedTab: (tabId: string | null) => void;
    focusTab: (tabId: string) => Promise<void>;
}
export declare const useTabGraphStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TabGraphState>>;
export {};
