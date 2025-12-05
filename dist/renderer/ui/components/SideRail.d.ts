/**
 * SideRail Component
 * Left dock for mode-specific tools and contextual overlays
 */
import { ReactNode } from 'react';
import { type ModeId } from '../tokens-enhanced';
export interface SideRailProps {
    open: boolean;
    width?: number;
    mode?: ModeId;
    tools?: ReactNode[];
    className?: string;
    onClose?: () => void;
}
/**
 * SideRail - Left dock for mode tools
 *
 * Features:
 * - Mode-specific toolkits
 * - Collapsible/expandable
 * - Keyboard accessible
 * - Smooth animations
 */
export declare function SideRail({ open, width, mode, tools, className, onClose, }: SideRailProps): import("react/jsx-runtime").JSX.Element;
