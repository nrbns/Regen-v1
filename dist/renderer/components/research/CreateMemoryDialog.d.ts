/**
 * Create Memory Dialog
 * Modal for creating new memory events (notes, bookmarks, tasks)
 */
import type { MemoryEventType } from '../../core/supermemory/event-types';
interface CreateMemoryDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated?: () => void;
    initialType?: MemoryEventType;
    initialUrl?: string;
    initialTitle?: string;
}
export declare function CreateMemoryDialog({ open, onClose, onCreated, initialType, initialUrl, initialTitle, }: CreateMemoryDialogProps): import("react/jsx-runtime").JSX.Element | null;
export {};
