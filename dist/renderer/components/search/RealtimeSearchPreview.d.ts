/**
 * Realtime Search Preview - Telepathy Upgrade Phase 1
 * Live top-5 preview under omnibar with 150ms debounce
 * Feels exactly like Perplexity Pro on steroids
 */
interface SearchPreviewResult {
    id: string;
    title: string;
    url?: string;
    type: 'tab' | 'memory' | 'web';
    score: number;
    snippet?: string;
}
interface RealtimeSearchPreviewProps {
    query: string;
    onSelect: (result: SearchPreviewResult) => void;
    isVisible: boolean;
}
export declare function RealtimeSearchPreview({ query, onSelect, isVisible }: RealtimeSearchPreviewProps): import("react/jsx-runtime").JSX.Element | null;
export {};
