import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Layout Engine - Unified layout structure
 * Provides consistent sidebar, navigation, and main content areas
 */
import { createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
const LayoutContext = createContext({
    sidebarWidth: 240,
    navHeight: 64,
    rightPanelWidth: 0,
});
export const useLayout = () => useContext(LayoutContext);
/**
 * Main Layout Engine - Provides consistent structure
 */
export function LayoutEngine({ children, sidebarWidth = 240, navHeight = 64, rightPanelWidth = 0, ...props }) {
    return (_jsx(LayoutContext.Provider, { value: { sidebarWidth, navHeight, rightPanelWidth }, children: _jsx("div", { className: "flex h-full w-full flex-col overflow-hidden", "data-testid": "layout-engine-root", ...props, children: children }) }));
}
/**
 * Layout Header - Top navigation area
 */
export function LayoutHeader({ sticky = true, className, children, ...props }) {
    const { navHeight } = useLayout();
    return (_jsx("header", { className: cn('flex-shrink-0 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-xl', sticky && 'sticky top-0 z-40', className), style: { height: navHeight }, ...props, children: children }));
}
/**
 * Layout Body - Main content area with optional sidebars
 */
export function LayoutBody({ sidebar, rightPanel, sidebarCollapsed = false, rightPanelCollapsed = false, className, children, ...props }) {
    const { sidebarWidth, rightPanelWidth } = useLayout();
    return (_jsxs("div", { className: cn('flex flex-1 min-h-0 overflow-hidden', className), ...props, children: [sidebar && (_jsx(motion.aside, { initial: false, animate: {
                    width: sidebarCollapsed ? 0 : sidebarWidth,
                    opacity: sidebarCollapsed ? 0 : 1,
                }, transition: { duration: 0.2, ease: 'easeInOut' }, className: "flex-shrink-0 border-r border-slate-700/50 bg-slate-900/60 overflow-hidden", style: { width: sidebarCollapsed ? 0 : sidebarWidth }, children: _jsx("div", { className: "h-full overflow-y-auto", children: sidebar }) })), _jsx("main", { className: "flex-1 min-w-0 overflow-hidden bg-slate-950", children: children }), rightPanel && (_jsx(motion.aside, { initial: false, animate: {
                    width: rightPanelCollapsed ? 0 : rightPanelWidth || 320,
                    opacity: rightPanelCollapsed ? 0 : 1,
                }, transition: { duration: 0.2, ease: 'easeInOut' }, className: "flex-shrink-0 border-l border-slate-700/50 bg-slate-900/60 overflow-hidden", style: { width: rightPanelCollapsed ? 0 : rightPanelWidth || 320 }, children: _jsx("div", { className: "h-full overflow-y-auto", children: rightPanel }) }))] }));
}
/**
 * Layout Footer - Bottom area
 */
export function LayoutFooter({ sticky = false, className, children, ...props }) {
    return (_jsx("footer", { className: cn('flex-shrink-0 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-xl', sticky && 'sticky bottom-0 z-40', className), ...props, children: children }));
}
const sectionSpacing = {
    none: '',
    sm: 'py-3',
    md: 'py-6',
    lg: 'py-8',
    xl: 'py-12',
};
export function LayoutSection({ spacing = 'md', padded = true, className, children, ...props }) {
    return (_jsx("section", { className: cn('w-full', sectionSpacing[spacing], padded && 'px-[var(--layout-page-padding)]', className), ...props, children: children }));
}
const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-12',
};
const gridGap = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
};
export function LayoutGrid({ cols = 3, gap = 'md', className, children, ...props }) {
    return (_jsx("div", { className: cn('grid', gridCols[cols], gridGap[gap], className), ...props, children: children }));
}
