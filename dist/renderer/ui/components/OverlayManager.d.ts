/**
 * OverlayManager Component
 * Manages modal/panel stack & focus trap
 */
import React, { ReactNode } from 'react';
export interface Overlay {
    id: string;
    component: ReactNode;
    priority?: number;
    backdrop?: boolean;
    closeOnEscape?: boolean;
    closeOnBackdrop?: boolean;
    onClose?: () => void;
}
export interface OverlayManagerProps {
    overlays: Overlay[];
    onClose?: (id: string) => void;
}
/**
 * OverlayManager - Manages modal/panel stack
 *
 * Features:
 * - Stack management (priority-based)
 * - Focus trap
 * - Escape key handling
 * - Backdrop click handling
 * - Body scroll lock
 */
export declare function OverlayManager({ overlays, onClose }: OverlayManagerProps): React.ReactPortal;
