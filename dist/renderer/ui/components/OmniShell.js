import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * OmniShell Component
 * Root container & layout engine for the browser shell
 * Provides mode-first architecture with contextual overlays
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from './TopBar';
import { useTokens } from '../useTokens';
import { useAppStore } from '../../state/appStore';
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
export function OmniShell({ children, className = '', showTopBar = true, showStatusBar = true, onModeChange, }) {
    const tokens = useTokens();
    const mode = useAppStore((s) => s.mode);
    // Apply reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = () => {
            document.documentElement.style.setProperty('--motion-reduce', mediaQuery.matches ? '1' : '0');
        };
        handleChange();
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);
    return (_jsxs("div", { className: `
        flex flex-col h-screen w-screen
        bg-[var(--surface-root)] text-[var(--text-primary)]
        overflow-hidden
        ${className}
      `, role: "application", "aria-label": "Regen", children: [showTopBar && (_jsx(TopBar, { onModeChange: (modeId) => {
                    onModeChange?.(modeId);
                } })), _jsx("main", { className: "flex-1 flex overflow-hidden relative", role: "main", style: {
                    minHeight: 0, // Allows flex children to shrink
                }, children: _jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: {
                            duration: 0.18,
                            ease: [0.2, 0.9, 0.3, 1],
                        }, className: "flex-1 flex flex-col overflow-hidden", style: {
                            // Respect reduced motion
                            transition: 'opacity 180ms cubic-bezier(0.2, 0.9, 0.3, 1)',
                        }, children: children }, mode) }) }), showStatusBar && (_jsx("div", { className: "border-t border-[var(--surface-border)] bg-[var(--surface-panel)]", role: "contentinfo", "aria-label": "Status bar", style: {
                    height: '32px',
                    padding: `0 ${tokens.spacing(3)}`,
                } }))] }));
}
