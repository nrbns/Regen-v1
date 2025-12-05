/**
 * Perplexity-Style Research Mode Panel
 * Clean AI research interface - NO TABS, NO WEBVIEWS, PURE AI
 */
import type { ResearchResult } from '../../types/research';
interface ResearchModePanelProps {
    query?: string;
    result?: ResearchResult | null;
    loading?: boolean;
    error?: string | null;
    onSearch?: (query: string) => void;
    onFollowUp?: (query: string) => void;
}
export default function ResearchModePanel({ query: parentQuery, result: parentResult, loading: parentLoading, error: parentError, onSearch, onFollowUp, }: ResearchModePanelProps): import("react/jsx-runtime").JSX.Element;
export {};
