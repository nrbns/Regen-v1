import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * CommandBar Component
 * Global slash-driven command/search interface
 * Similar to VS Code's command palette or Spotlight
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Command, ArrowRight } from 'lucide-react';
import { useTokens } from '../useTokens';
/**
 * CommandBar - Global command palette
 *
 * Keyboard shortcuts:
 * - / or Cmd+K / Ctrl+K: Open command bar
 * - Escape: Close
 * - Arrow Up/Down: Navigate
 * - Enter: Execute
 * - Tab: Complete
 */
export function CommandBar({ open, commands, onClose, onCommand, placeholder = 'Type a command or search...', className = '', }) {
    const tokens = useTokens();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredCommands, setFilteredCommands] = useState(commands);
    const inputRef = useRef(null);
    // Filter commands based on query
    useEffect(() => {
        if (!query.trim()) {
            setFilteredCommands(commands);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const filtered = commands.filter(cmd => {
            const matchLabel = cmd.label.toLowerCase().includes(lowerQuery);
            const matchDescription = cmd.description?.toLowerCase().includes(lowerQuery);
            const matchCategory = cmd.category?.toLowerCase().includes(lowerQuery);
            return matchLabel || matchDescription || matchCategory;
        });
        // Sort by relevance (exact matches first, then prefix matches)
        filtered.sort((a, b) => {
            const aExact = a.label.toLowerCase().startsWith(lowerQuery);
            const bExact = b.label.toLowerCase().startsWith(lowerQuery);
            if (aExact && !bExact)
                return -1;
            if (!aExact && bExact)
                return 1;
            return a.label.localeCompare(b.label);
        });
        setFilteredCommands(filtered);
        setSelectedIndex(0);
    }, [query, commands]);
    // Focus input when opened
    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [open]);
    // Keyboard navigation
    useEffect(() => {
        if (!open)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const selected = filteredCommands[selectedIndex];
                if (selected) {
                    handleCommandSelect(selected);
                }
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, filteredCommands, selectedIndex, onClose]);
    const handleCommandSelect = useCallback((command) => {
        onCommand?.(command);
        command.action();
        onClose();
    }, [onCommand, onClose]);
    // Global keyboard shortcut to open (Cmd+K / Ctrl+K or /)
    useEffect(() => {
        const handleGlobalKey = (e) => {
            // Cmd+K / Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (!open) {
                    // Trigger open (parent should handle this)
                    window.dispatchEvent(new CustomEvent('commandbar:open'));
                }
                return;
            }
            // Slash key (when not in input)
            if (e.key === '/' &&
                !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                if (!open) {
                    window.dispatchEvent(new CustomEvent('commandbar:open'));
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKey);
        return () => window.removeEventListener('keydown', handleGlobalKey);
    }, [open]);
    if (!open)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50", "aria-hidden": "true" }), _jsxs(motion.div, { initial: { opacity: 0, scale: 0.95, y: -20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: -20 }, transition: {
                    duration: 0.18,
                    ease: [0.2, 0.9, 0.3, 1],
                }, className: `
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
          w-full max-w-2xl
          bg-[var(--surface-panel)] border border-[var(--surface-border)]
          rounded-lg shadow-2xl
          ${className}
        `, role: "dialog", "aria-modal": "true", "aria-label": "Command palette", children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-[var(--surface-border)]", style: { padding: tokens.spacing(3) }, children: [_jsx(Search, { size: 18, className: "text-[var(--text-muted)] flex-shrink-0" }), _jsx("input", { ref: inputRef, type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: placeholder, className: "flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none", style: { fontSize: tokens.fontSize.base }, "aria-label": "Command search" }), _jsxs("div", { className: "flex items-center gap-1 text-[var(--text-muted)] text-xs", children: [_jsx("kbd", { className: "px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--surface-border)]", children: "Esc" }), _jsx("span", { children: "to close" })] })] }), _jsx("div", { className: "max-h-96 overflow-y-auto", style: { padding: tokens.spacing(2) }, children: filteredCommands.length === 0 ? (_jsx("div", { className: "text-center text-[var(--text-muted)] py-8", style: { fontSize: tokens.fontSize.sm }, children: "No commands found" })) : (_jsx("div", { className: "flex flex-col gap-1", children: filteredCommands.map((command, index) => {
                                const isSelected = index === selectedIndex;
                                return (_jsxs("button", { onClick: () => handleCommandSelect(command), onMouseEnter: () => setSelectedIndex(index), className: `
                      flex items-center gap-3 px-3 py-2 rounded-md
                      transition-colors
                      focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]
                      ${isSelected
                                        ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}
                    `, style: { fontSize: tokens.fontSize.sm }, children: [_jsx("div", { className: "flex-shrink-0 text-[var(--text-muted)]", children: command.icon || _jsx(Command, { size: 16 }) }), _jsxs("div", { className: "flex-1 text-left min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: command.label }), command.description && (_jsx("div", { className: "text-[var(--text-muted)] truncate", style: { fontSize: tokens.fontSize.xs }, children: command.description }))] }), command.shortcut && (_jsx("div", { className: "flex-shrink-0", children: _jsx("kbd", { className: "px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.xs }, children: command.shortcut }) })), isSelected && (_jsx(ArrowRight, { size: 16, className: "flex-shrink-0 text-[var(--color-primary-500)]" }))] }, command.id));
                            }) })) }), filteredCommands.length > 0 && (_jsxs("div", { className: "flex items-center justify-between border-t border-[var(--surface-border)] text-[var(--text-muted)]", style: {
                            padding: tokens.spacing(2),
                            fontSize: tokens.fontSize.xs,
                        }, children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { children: "\u2191\u2193 to navigate" }), _jsx("span", { children: "Enter to select" })] }), _jsxs("span", { children: [filteredCommands.length, " ", filteredCommands.length === 1 ? 'result' : 'results'] })] }))] })] }));
}
