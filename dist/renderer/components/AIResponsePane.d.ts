/**
 * AIResponsePane - Streaming AI response display for search queries
 * Shows token-by-token streaming responses from Redix
 */
interface AIResponsePaneProps {
    query: string;
    isOpen: boolean;
    onClose: () => void;
}
export declare function AIResponsePane({ query, isOpen, onClose }: AIResponsePaneProps): import("react/jsx-runtime").JSX.Element | null;
export {};
