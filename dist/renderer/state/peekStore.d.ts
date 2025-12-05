import type { Tab } from './tabsStore';
type PeekState = {
    visible: boolean;
    tab: Tab | null;
    open: (tab: Tab) => void;
    close: () => void;
    sync: (tab: Tab) => void;
};
export declare const usePeekPreviewStore: import("zustand").UseBoundStore<import("zustand").StoreApi<PeekState>>;
export {};
