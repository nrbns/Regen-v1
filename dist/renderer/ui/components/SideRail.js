import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, AnimatePresence } from 'framer-motion';
import { useTokens } from '../useTokens';
/**
 * SideRail - Left dock for mode tools
 *
 * Features:
 * - Mode-specific toolkits
 * - Collapsible/expandable
 * - Keyboard accessible
 * - Smooth animations
 */
export function SideRail({ open, width = 280, mode, tools = [], className = '', onClose, }) {
    const tokens = useTokens();
    return (_jsx(AnimatePresence, { children: open && (_jsxs(motion.aside, { initial: { x: -width }, animate: { x: 0 }, exit: { x: -width }, transition: {
                duration: 0.18,
                ease: [0.2, 0.9, 0.3, 1],
            }, className: `
            fixed left-0 top-0 bottom-0 z-40
            bg-[var(--surface-panel)] border-r border-[var(--surface-border)]
            flex flex-col
            ${className}
          `, style: {
                width: `${width}px`,
                padding: tokens.spacing(3),
            }, role: "complementary", "aria-label": "Mode tools", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "font-semibold text-[var(--text-primary)]", style: { fontSize: tokens.fontSize.sm }, children: mode ? `${mode.charAt(0).toUpperCase() + mode.slice(1)} Tools` : 'Tools' }), onClose && (_jsx("button", { onClick: onClose, className: "p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]", "aria-label": "Close side rail", children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: _jsx("path", { d: "M12 4L4 12M4 4l8 8", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }) }))] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsx("div", { className: "flex flex-col gap-2", children: tools.length > 0 ? (tools.map((tool, index) => _jsx("div", { children: tool }, index))) : (_jsx("div", { className: "text-[var(--text-muted)] text-center py-8", style: { fontSize: tokens.fontSize.sm }, children: "No tools available for this mode" })) }) })] })) }));
}
