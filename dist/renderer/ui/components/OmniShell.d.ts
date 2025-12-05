/**
 * OmniShell Component
 * Root container & layout engine for the browser shell
 * Provides mode-first architecture with contextual overlays
 */
import { ReactNode } from 'react';
import { type ModeId } from '../tokens-enhanced';
export interface OmniShellProps {
    children: ReactNode;
    className?: string;
    showTopBar?: boolean;
    showStatusBar?: boolean;
    onModeChange?: (mode: ModeId) => void;
}
/**
 * OmniShell - Root layout container
 *
 * Features:
 * - Mode-first architecture
 * - Contextual tool overlays
 * - Keyboard-first navigation
 * - Focus management
 * - Reduced motion support
 */
export declare function OmniShell({ children, className, showTopBar, showStatusBar, onModeChange, }: OmniShellProps): import("react/jsx-runtime").JSX.Element;
