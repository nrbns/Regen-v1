/**
 * Tooltip Component
 * Accessible tooltip with keyboard support
 */
import React from 'react';
export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    disabled?: boolean;
}
/**
 * Tooltip - Accessible tooltip component
 *
 * Features:
 * - Keyboard accessible (focus shows tooltip)
 * - Respects reduced motion
 * - Auto-positioning
 * - ARIA attributes
 */
export declare function Tooltip({ content, children, placement, delay, disabled, }: TooltipProps): import("react/jsx-runtime").JSX.Element;
