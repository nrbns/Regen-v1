export type SuspensionReason = 'inactivity' | 'manual' | 'memory';
export interface SuspendedTabRecord {
    tabId: string;
    title?: string;
    url?: string;
    snapshot?: string | null;
    suspendedAt: number;
    lastActiveAt?: number;
    acknowledged?: boolean;
    reason?: SuspensionReason;
}
interface SuspensionEvent {
    tabId: string;
    type: 'suspended' | 'restored';
    timestamp: number;
    reason?: SuspensionReason;
}
interface TabSuspensionState {
    suspensions: Record<string, SuspendedTabRecord>;
    lastEvent?: SuspensionEvent;
    setSuspended: (record: SuspendedTabRecord) => void;
    acknowledge: (tabId: string) => void;
    resolve: (tabId: string, options?: {
        silent?: boolean;
    }) => void;
    cleanup: () => void;
}
export declare const useTabSuspensionStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TabSuspensionState>>;
export {};
