/**
 * Export Memories Dialog
 * Modal for exporting memories to JSON or CSV with filtering options
 */
import type { MemoryEvent } from '../../core/supermemory/tracker';
interface ExportMemoriesDialogProps {
    open: boolean;
    onClose: () => void;
    events: MemoryEvent[];
    availableTags: string[];
}
export declare function ExportMemoriesDialog({ open, onClose, events, availableTags, }: ExportMemoriesDialogProps): import("react/jsx-runtime").JSX.Element | null;
export {};
