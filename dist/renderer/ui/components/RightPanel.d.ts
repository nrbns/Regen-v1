/**
 * RightPanel Component
 * Slide-over panel for contextual content (e.g., SuperMemory)
 */
import { ReactNode } from 'react';
export interface RightPanelProps {
    open: boolean;
    width?: number;
    title?: string;
    children: ReactNode;
    className?: string;
    onClose?: () => void;
    closeOnEscape?: boolean;
    closeOnBackdrop?: boolean;
}
/**
 * RightPanel - Slide-over panel
 *
 * Features:
 * - Slide-in animation
 * - Focus trap
 * - Escape key to close
 * - Backdrop click to close
 * - Keyboard accessible
 */
export declare function RightPanel({ open, width, title, children, className, onClose, closeOnEscape, closeOnBackdrop, }: RightPanelProps): import("react/jsx-runtime").JSX.Element;
