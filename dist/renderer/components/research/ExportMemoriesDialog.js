import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Export Memories Dialog
 * Modal for exporting memories to JSON or CSV with filtering options
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileJson, FileSpreadsheet, Calendar, Filter, Tag as TagIcon, } from 'lucide-react';
import { exportMemories } from '../../utils/export';
import { showToast } from '../../state/toastStore';
import { useTokens } from '../../ui/useTokens';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
export function ExportMemoriesDialog({ open, onClose, events, availableTags, }) {
    const tokens = useTokens();
    const [format, setFormat] = useState('json');
    const [dateRange, setDateRange] = useState({});
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const allEventTypes = [
        'search',
        'visit',
        'mode_switch',
        'bookmark',
        'note',
        'task',
        'highlight',
        'screenshot',
        'agent',
    ];
    const handleToggleType = useCallback((type) => {
        setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    }, []);
    const handleToggleTag = useCallback((tag) => {
        setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
    }, []);
    const handleExport = useCallback(() => {
        setLoading(true);
        try {
            const options = {
                format,
                dateRange: dateRange.start || dateRange.end
                    ? {
                        start: dateRange.start ? new Date(dateRange.start).getTime() : undefined,
                        end: dateRange.end ? new Date(dateRange.end).getTime() : undefined,
                    }
                    : undefined,
                filterByType: selectedTypes.length > 0 ? selectedTypes : undefined,
                filterByTags: selectedTags.length > 0 ? selectedTags : undefined,
            };
            exportMemories(events, options);
            const count = events.length;
            showToast('success', `Exported ${count} ${count === 1 ? 'memory' : 'memories'} to ${format.toUpperCase()}`);
            onClose();
        }
        catch (error) {
            console.error('[ExportMemoriesDialog] Export failed:', error);
            showToast('error', 'Failed to export memories');
        }
        finally {
            setLoading(false);
        }
    }, [format, dateRange, selectedTypes, selectedTags, events, onClose]);
    const handleClose = useCallback(() => {
        if (!loading) {
            onClose();
        }
    }, [loading, onClose]);
    if (!open)
        return null;
    const filteredCount = events.length; // Could calculate actual filtered count
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: e => {
                        // Only close if clicking directly on backdrop, not on dialog content
                        if (e.target === e.currentTarget) {
                            handleClose();
                        }
                    }, onMouseDown: e => {
                        // Don't interfere with button clicks
                        const target = e.target;
                        if (target.closest('button') ||
                            target.closest('[role="button"]') ||
                            target.closest('[role="dialog"]')) {
                            return;
                        }
                    }, className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-50", "aria-hidden": "true" }), _jsx(motion.div, { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 }, transition: { type: 'spring', damping: 25, stiffness: 300 }, className: "fixed inset-0 z-50 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", "aria-labelledby": "export-memories-title", children: _jsxs("div", { className: "w-full max-w-2xl bg-[var(--surface-root)] border border-[var(--surface-border)] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[var(--surface-border)]", style: { padding: tokens.spacing(4) }, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Download, { size: 20, className: "text-[var(--color-primary-400)]" }), _jsx("h2", { id: "export-memories-title", className: "font-semibold text-[var(--text-primary)]", style: { fontSize: tokens.fontSize.lg }, children: "Export Memories" })] }), _jsx("button", { onClick: e => {
                                            e.stopImmediatePropagation();
                                            e.stopPropagation();
                                            handleClose();
                                        }, onMouseDown: e => {
                                            e.stopImmediatePropagation();
                                            e.stopPropagation();
                                        }, disabled: loading, className: "rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] disabled:opacity-50", style: { zIndex: 10011, isolation: 'isolate' }, "aria-label": "Close dialog", children: _jsx(X, { size: 18 }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto", style: { padding: tokens.spacing(4) }, children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-[var(--text-primary)] mb-3", style: { fontSize: tokens.fontSize.sm }, children: "Export Format" }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                                setFormat('json');
                                                            }, onMouseDown: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                            }, className: `
                          flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border transition-all
                          ${format === 'json'
                                                                ? 'bg-[var(--color-primary-600)] border-[var(--color-primary-500)] text-white'
                                                                : 'bg-[var(--surface-elevated)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}
                          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                        `, style: { zIndex: 10011, isolation: 'isolate' }, "aria-pressed": format === 'json', children: [_jsx(FileJson, { size: 20 }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "font-medium", children: "JSON" }), _jsx("div", { className: "text-xs opacity-80", children: "Structured data format" })] })] }), _jsxs("button", { onClick: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                                setFormat('csv');
                                                            }, onMouseDown: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                            }, className: `
                          flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border transition-all
                          ${format === 'csv'
                                                                ? 'bg-[var(--color-primary-600)] border-[var(--color-primary-500)] text-white'
                                                                : 'bg-[var(--surface-elevated)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}
                          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                        `, style: { zIndex: 10011, isolation: 'isolate' }, "aria-pressed": format === 'csv', children: [_jsx(FileSpreadsheet, { size: 20 }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "font-medium", children: "CSV" }), _jsx("div", { className: "text-xs opacity-80", children: "Spreadsheet format" })] })] })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-[var(--text-primary)] mb-3", style: { fontSize: tokens.fontSize.sm }, children: [_jsx(Calendar, { size: 16, className: "inline mr-2" }), "Date Range (Optional)"] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "export-start-date", className: "block text-xs text-[var(--text-muted)] mb-1.5", style: { fontSize: tokens.fontSize.xs }, children: "Start Date" }), _jsx(Input, { id: "export-start-date", type: "date", value: dateRange.start || '', onChange: e => setDateRange(prev => ({ ...prev, start: e.target.value })), disabled: loading })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "export-end-date", className: "block text-xs text-[var(--text-muted)] mb-1.5", style: { fontSize: tokens.fontSize.xs }, children: "End Date" }), _jsx(Input, { id: "export-end-date", type: "date", value: dateRange.end || '', onChange: e => setDateRange(prev => ({ ...prev, end: e.target.value })), disabled: loading })] })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-[var(--text-primary)] mb-3", style: { fontSize: tokens.fontSize.sm }, children: [_jsx(Filter, { size: 16, className: "inline mr-2" }), "Filter by Type (Optional)"] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [allEventTypes.map(type => (_jsx("button", { onClick: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                                handleToggleType(type);
                                                            }, onMouseDown: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                            }, className: `
                            px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                            ${selectedTypes.includes(type)
                                                                ? 'bg-[var(--color-primary-600)] text-white'
                                                                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}
                            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                          `, style: {
                                                                fontSize: tokens.fontSize.sm,
                                                                zIndex: 10011,
                                                                isolation: 'isolate',
                                                            }, "aria-pressed": selectedTypes.includes(type), children: type.replace('_', ' ') }, type))), selectedTypes.length > 0 && (_jsx("button", { onClick: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                                setSelectedTypes([]);
                                                            }, onMouseDown: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                            }, className: "px-3 py-1.5 rounded-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors", style: {
                                                                fontSize: tokens.fontSize.sm,
                                                                zIndex: 10011,
                                                                isolation: 'isolate',
                                                            }, children: "Clear" }))] })] }), availableTags.length > 0 && (_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-[var(--text-primary)] mb-3", style: { fontSize: tokens.fontSize.sm }, children: [_jsx(TagIcon, { size: 16, className: "inline mr-2" }), "Filter by Tags (Optional)"] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [availableTags.slice(0, 10).map(tag => (_jsxs("button", { onClick: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                                handleToggleTag(tag);
                                                            }, onMouseDown: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                            }, className: `
                              px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                              ${selectedTags.includes(tag)
                                                                ? 'bg-[var(--color-primary-600)] text-white'
                                                                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}
                              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                            `, style: {
                                                                fontSize: tokens.fontSize.sm,
                                                                zIndex: 10011,
                                                                isolation: 'isolate',
                                                            }, "aria-pressed": selectedTags.includes(tag), children: ["#", tag] }, tag))), selectedTags.length > 0 && (_jsx("button", { onClick: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                                setSelectedTags([]);
                                                            }, onMouseDown: e => {
                                                                e.stopImmediatePropagation();
                                                                e.stopPropagation();
                                                            }, className: "px-3 py-1.5 rounded-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors", style: {
                                                                fontSize: tokens.fontSize.sm,
                                                                zIndex: 10011,
                                                                isolation: 'isolate',
                                                            }, children: "Clear" }))] })] })), _jsxs("div", { className: "rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)]", style: { padding: tokens.spacing(3) }, children: [_jsx("div", { className: "text-sm text-[var(--text-primary)] font-medium mb-1", children: "Export Summary" }), _jsxs("div", { className: "text-xs text-[var(--text-muted)] space-y-1", children: [_jsxs("div", { children: ["Format: ", format.toUpperCase()] }), _jsxs("div", { children: ["Memories: ", filteredCount] }), dateRange.start && (_jsxs("div", { children: ["From: ", new Date(dateRange.start).toLocaleDateString()] })), dateRange.end && (_jsxs("div", { children: ["To: ", new Date(dateRange.end).toLocaleDateString()] })), selectedTypes.length > 0 && (_jsxs("div", { children: ["Types: ", selectedTypes.length, " selected"] })), selectedTags.length > 0 && _jsxs("div", { children: ["Tags: ", selectedTags.length, " selected"] })] })] })] }) }), _jsxs("div", { className: "flex items-center justify-end gap-3 border-t border-[var(--surface-border)]", style: { padding: tokens.spacing(4) }, children: [_jsx(Button, { type: "button", tone: "secondary", onClick: e => {
                                            e.stopImmediatePropagation();
                                            e.stopPropagation();
                                            handleClose();
                                        }, onMouseDown: e => {
                                            e.stopImmediatePropagation();
                                            e.stopPropagation();
                                        }, disabled: loading, style: { zIndex: 10011, isolation: 'isolate' }, children: "Cancel" }), _jsxs(Button, { type: "button", tone: "primary", icon: _jsx(Download, { size: 16 }), onClick: e => {
                                            e.stopImmediatePropagation();
                                            e.stopPropagation();
                                            handleExport();
                                        }, onMouseDown: e => {
                                            e.stopImmediatePropagation();
                                            e.stopPropagation();
                                        }, disabled: loading, loading: loading, style: { zIndex: 10011, isolation: 'isolate' }, children: ["Export ", format.toUpperCase()] })] })] }) })] })) }));
}
