import { ResearchHighlight } from '../../types/research';
interface ClipperOverlayProps {
    active: boolean;
    onCancel: () => void;
    onCreateHighlight: (highlight: ResearchHighlight) => void;
}
export declare function ClipperOverlay({ active, onCancel, onCreateHighlight }: ClipperOverlayProps): import("react/jsx-runtime").JSX.Element;
export {};
