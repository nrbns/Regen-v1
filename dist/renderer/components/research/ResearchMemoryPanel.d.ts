/**
 * Research Memory Panel - Redesigned SuperMemory UI
 * Modern, scannable, keyboard-first interface for browsing memories
 */
interface ResearchMemoryPanelProps {
    open: boolean;
    onClose: () => void;
    onCreateMemory?: () => void;
}
export declare function ResearchMemoryPanel({ open, onClose, onCreateMemory }: ResearchMemoryPanelProps): import("react/jsx-runtime").JSX.Element | null;
export {};
