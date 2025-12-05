/**
 * ModePreviewCard Component
 * Shows a preview of what will change when switching modes
 */
import { type ModeId } from '../tokens-enhanced';
export interface ModePreviewCardProps {
    preview: {
        from: ModeId;
        to: ModeId;
        changes: string[];
    };
    onConfirm: () => void;
    onCancel: () => void;
}
export declare function ModePreviewCard({ preview, onConfirm, onCancel }: ModePreviewCardProps): import("react/jsx-runtime").JSX.Element;
