type Cluster = {
    id: string;
    label: string;
    tabIds: string[];
    confidence?: number;
};
type PrefetchEntry = {
    tabId: string;
    url: string;
    reason: string;
    confidence?: number;
};
interface PredictiveClusterChipProps {
    clusters: Cluster[];
    summary?: string | null;
    onApply: (clusterId: string) => void;
}
export declare function PredictiveClusterChip({ clusters, summary, onApply }: PredictiveClusterChipProps): import("react/jsx-runtime").JSX.Element | null;
interface PredictivePrefetchHintProps {
    entry: PrefetchEntry | null;
    onOpen: (entry: PrefetchEntry) => void;
}
export declare function PredictivePrefetchHint({ entry, onOpen }: PredictivePrefetchHintProps): import("react/jsx-runtime").JSX.Element | null;
export {};
