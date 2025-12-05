import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ModeTabs Component
 * Mode switching tabs with visual indicators and mode shifting
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, TrendingUp, Code, MoreHorizontal } from 'lucide-react';
import { useModeShift } from '../hooks/useModeShift';
import { useAppStore } from '../../state/appStore';
import { useTokens } from '../useTokens';
const MODE_CONFIG = [
    { id: 'browse', label: 'Browse', icon: Globe, shortcut: '1' },
    { id: 'research', label: 'Research', icon: Search, shortcut: '2' },
    { id: 'trade', label: 'Trade', icon: TrendingUp, shortcut: '3' },
    { id: 'dev', label: 'Dev', icon: Code, shortcut: '4', comingSoon: true }, // Tier 1: Hide unfinished
];
export function ModeTabs({ className, compact, onModeChange }) {
    const tokens = useTokens();
    const { currentMode, isShifting } = useModeShift();
    const setMode = useAppStore(state => state.setMode);
    const [hoveredMode, setHoveredMode] = useState(null);
    const buttonRefs = useRef({
        browse: null,
        research: null,
        trade: null,
        dev: null,
    });
    // Map AppState mode to ModeId
    const currentModeId = currentMode === 'Browse'
        ? 'browse'
        : currentMode === 'Research'
            ? 'research'
            : currentMode === 'Trade'
                ? 'trade'
                : 'browse';
    const handleModeClick = React.useCallback(async (modeId) => {
        if (modeId === currentModeId || isShifting)
            return;
        // Map ModeId to AppState mode
        const modeMap = {
            browse: 'Browse',
            research: 'Research',
            trade: 'Trade',
            dev: 'Browse', // Dev maps to Browse for now
        };
        const targetMode = modeMap[modeId];
        if (!targetMode)
            return;
        // Immediately switch mode by directly calling setMode
        await setMode(targetMode);
        // Call onModeChange callback if provided (for TopBar integration)
        if (onModeChange) {
            onModeChange(modeId);
        }
    }, [currentModeId, isShifting, setMode, onModeChange]);
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.altKey || e.ctrlKey || e.metaKey)
                return;
            const mode = MODE_CONFIG.find(m => m.shortcut === e.key);
            if (mode) {
                e.preventDefault();
                void handleModeClick(mode.id);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleModeClick]);
    return (_jsxs("div", { className: `flex items-center gap-1 ${className || ''}`, role: "tablist", "aria-label": "Mode selection", children: [MODE_CONFIG.map((mode) => {
                const Icon = mode.icon;
                const isActive = currentModeId === mode.id;
                const isHovered = hoveredMode === mode.id;
                const isComingSoon = mode.comingSoon;
                // Tier 1: Hide unfinished modes (only show Browse and Research)
                if (isComingSoon && !isActive) {
                    return null;
                }
                return (_jsxs("button", { ref: el => {
                        buttonRefs.current[mode.id] = el;
                    }, onClick: async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.nativeEvent?.stopImmediatePropagation) {
                            e.nativeEvent.stopImmediatePropagation();
                        }
                        if (isComingSoon) {
                            // Show "Coming Soon" toast instead of switching
                            const { toast } = await import('../../utils/toast');
                            toast.info(`${mode.label} mode is coming soon!`);
                            return;
                        }
                        await handleModeClick(mode.id);
                    }, onMouseDown: e => {
                        e.stopPropagation();
                    }, onMouseEnter: () => {
                        setHoveredMode(mode.id);
                    }, onMouseLeave: () => {
                        setHoveredMode(null);
                    }, disabled: isShifting || isComingSoon, className: `
              relative flex items-center gap-2 px-3 py-2 rounded-lg
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
              ${isActive
                        ? 'bg-[var(--color-primary-600)] text-white shadow-md'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}
              ${isShifting ? 'opacity-50 cursor-wait' : isComingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              ${compact ? 'px-2 py-1.5' : ''}
            `, style: {
                        fontSize: compact ? tokens.fontSize.xs : tokens.fontSize.sm,
                    }, role: "tab", "aria-selected": isActive, "aria-controls": `mode-${mode.id}`, title: isComingSoon ? `${mode.label} (Coming Soon)` : `${mode.label} (Alt+${mode.shortcut})`, children: [_jsx(Icon, { size: compact ? 16 : 18, className: isActive ? 'text-white' : 'text-[var(--text-muted)]' }), !compact && (_jsxs("span", { className: "font-medium", children: [mode.label, isComingSoon && _jsx("span", { className: "ml-1 text-xs opacity-70", children: "(Soon)" })] })), isActive && (_jsx(motion.div, { layoutId: "mode-indicator", className: "absolute inset-0 rounded-lg bg-[var(--color-primary-500)]/20", initial: false, transition: { type: 'spring', stiffness: 500, damping: 30 } })), isHovered && !isActive && (_jsx(motion.div, { className: "absolute inset-0 rounded-lg bg-[var(--surface-hover)]", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }))] }, mode.id));
            }), _jsx("button", { className: `
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-[var(--surface-elevated)] text-[var(--text-secondary)]
          hover:bg-[var(--surface-hover)] transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
          ${compact ? 'px-2 py-1.5' : ''}
        `, style: {
                    fontSize: compact ? tokens.fontSize.xs : tokens.fontSize.sm,
                }, "aria-label": "More modes", title: "More modes", children: _jsx(MoreHorizontal, { size: compact ? 16 : 18 }) }), isShifting && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "ml-2 text-[var(--text-muted)] text-xs", children: "Switching..." }))] }));
}
