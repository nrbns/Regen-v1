/**
 * Layout Engine - Unified layout structure
 * Provides consistent sidebar, navigation, and main content areas
 */
import React from 'react';
interface LayoutContextValue {
    sidebarWidth: number;
    navHeight: number;
    rightPanelWidth: number;
}
export declare const useLayout: () => LayoutContextValue;
interface LayoutEngineProps {
    children: React.ReactNode;
    sidebarWidth?: number;
    navHeight?: number;
    rightPanelWidth?: number;
}
/**
 * Main Layout Engine - Provides consistent structure
 */
export declare function LayoutEngine({ children, sidebarWidth, navHeight, rightPanelWidth, ...props }: LayoutEngineProps & React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
interface LayoutHeaderProps extends React.HTMLAttributes<HTMLElement> {
    sticky?: boolean;
}
/**
 * Layout Header - Top navigation area
 */
export declare function LayoutHeader({ sticky, className, children, ...props }: LayoutHeaderProps): import("react/jsx-runtime").JSX.Element;
interface LayoutBodyProps extends React.HTMLAttributes<HTMLDivElement> {
    sidebar?: React.ReactNode;
    rightPanel?: React.ReactNode;
    sidebarCollapsed?: boolean;
    rightPanelCollapsed?: boolean;
}
/**
 * Layout Body - Main content area with optional sidebars
 */
export declare function LayoutBody({ sidebar, rightPanel, sidebarCollapsed, rightPanelCollapsed, className, children, ...props }: LayoutBodyProps): import("react/jsx-runtime").JSX.Element;
interface LayoutFooterProps extends React.HTMLAttributes<HTMLElement> {
    sticky?: boolean;
}
/**
 * Layout Footer - Bottom area
 */
export declare function LayoutFooter({ sticky, className, children, ...props }: LayoutFooterProps): import("react/jsx-runtime").JSX.Element;
/**
 * Layout Section - Content section with consistent spacing
 */
interface LayoutSectionProps extends React.HTMLAttributes<HTMLElement> {
    spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    padded?: boolean;
}
export declare function LayoutSection({ spacing, padded, className, children, ...props }: LayoutSectionProps): import("react/jsx-runtime").JSX.Element;
/**
 * Layout Grid - Responsive grid system
 */
interface LayoutGridProps extends React.HTMLAttributes<HTMLDivElement> {
    cols?: 1 | 2 | 3 | 4 | 6 | 12;
    gap?: 'sm' | 'md' | 'lg';
}
export declare function LayoutGrid({ cols, gap, className, children, ...props }: LayoutGridProps): import("react/jsx-runtime").JSX.Element;
export {};
