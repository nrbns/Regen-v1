/**
 * Loop Resume Modal
 * Shows crashed loops and offers to resume them
 */
interface LoopResumeModalProps {
    open: boolean;
    onClose: () => void;
}
export declare function LoopResumeModal({ open, onClose }: LoopResumeModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
