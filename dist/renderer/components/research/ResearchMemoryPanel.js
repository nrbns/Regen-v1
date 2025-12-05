import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Research Memory Panel - Redesigned SuperMemory UI
 * Modern, scannable, keyboard-first interface for browsing memories
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Pin, PinOff, Copy, ExternalLink, FileText, Plus, Tag as TagIcon, Filter, LayoutGrid, List, ChevronRight, } from 'lucide-react';
import { semanticSearchMemories } from '../../core/supermemory/search';
import { useDebounce } from '../../utils/useDebounce';
import { superMemoryDB } from '../../core/supermemory/db';
import { MemoryStoreInstance } from '../../core/supermemory/store';
import { showToast } from '../../state/toastStore';
import { useTokens } from '../../ui/useTokens';
import { SkeletonList } from '../../ui/skeleton';
import { Button } from '../../ui/button';
import { ipc } from '../../lib/ipc-typed';
import { CreateMemoryDialog } from './CreateMemoryDialog';
import { ExportMemoriesDialog } from './ExportMemoriesDialog';
function MemoryCard({ memory, compact, onPin, onCopy, onOpen, onDelete }) {
    const tokens = useTokens();
    const isPinned = memory.metadata?.pinned ?? false;
    const typeLabel = memory.type
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    const typeInitial = memory.type.charAt(0).toUpperCase();
    const timeStr = new Date(memory.ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
    const dateStr = new Date(memory.ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const handleCopy = useCallback(() => {
        const text = memory.metadata?.title || memory.value || '';
        navigator.clipboard
            .writeText(text)
            .then(() => {
            showToast('success', 'Copied to clipboard');
            onCopy(memory);
        })
            .catch(() => {
            showToast('error', 'Failed to copy');
        });
    }, [memory, onCopy]);
    const handleOpen = useCallback(() => {
        if (memory.metadata?.url) {
            window.open(memory.metadata.url, '_blank');
        }
        onOpen(memory);
    }, [memory, onOpen]);
    return (_jsx(motion.li, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.15 }, className: "group relative", children: _jsx("div", { className: `rounded-lg border transition-all duration-200 ${isPinned
                ? 'border-[var(--color-primary-500)]/40 bg-[var(--surface-elevated)] shadow-md'
                : 'hover:border-[var(--color-primary-500)]/30 border-[var(--surface-border)] bg-[var(--surface-panel)]'} hover:shadow-md`, style: { padding: tokens.spacing(3) }, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("div", { className: "flex flex-shrink-0 flex-col items-center", style: { width: tokens.spacing(10) }, children: [_jsx("div", { className: `flex items-center justify-center rounded-full text-xs font-semibold ${isPinned
                                    ? 'bg-[var(--color-primary-500)]/20 text-[var(--color-primary-400)]'
                                    : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'} `, style: {
                                    width: tokens.spacing(8),
                                    height: tokens.spacing(8),
                                }, "aria-label": `Type: ${typeLabel}`, children: typeInitial }), !compact && (_jsx("div", { className: "mt-1 text-xs text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.xs }, children: dateStr }))] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "mb-1 flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex min-w-0 flex-1 items-center gap-2", children: [_jsx("span", { className: "text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.xs }, children: typeLabel }), isPinned && (_jsx(Pin, { size: 12, className: "flex-shrink-0 text-[var(--color-primary-400)]", "aria-label": "Pinned" }))] }), _jsx("div", { className: "flex-shrink-0 text-xs text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.xs }, children: timeStr })] }), _jsx("h4", { className: "mb-1 line-clamp-2 font-semibold text-[var(--text-primary)]", style: { fontSize: tokens.fontSize.sm }, children: memory.metadata?.title || memory.value }), !compact && memory.metadata?.url && (_jsx("div", { className: "mb-2 truncate text-xs text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.xs }, children: memory.metadata.url })), !compact && memory.value && memory.value !== memory.metadata?.title && (_jsx("p", { className: "mb-2 line-clamp-2 text-sm text-[var(--text-secondary)]", style: { fontSize: tokens.fontSize.sm }, children: memory.value })), memory.metadata?.tags && memory.metadata.tags.length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1.5", children: memory.metadata.tags.map((tag) => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-xs text-[var(--color-primary-300)]", style: { fontSize: tokens.fontSize.xs }, children: [_jsx(TagIcon, { size: 10 }), tag.startsWith('#') ? tag : `#${tag}`] }, tag))) }))] }), _jsxs("div", { className: "ml-2 flex flex-col gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100", role: "group", "aria-label": "Memory actions", children: [_jsx("button", { onClick: () => onPin(memory.id, !isPinned), className: `rounded-md p-1.5 transition-colors ${isPinned
                                    ? 'bg-[var(--color-primary-500)]/10 text-[var(--color-primary-400)]'
                                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-400)]'} focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1`, "aria-label": isPinned ? 'Unpin memory' : 'Pin memory', title: isPinned ? 'Unpin' : 'Pin', children: isPinned ? _jsx(Pin, { size: 14 }) : _jsx(PinOff, { size: 14 }) }), memory.metadata?.url && (_jsx("button", { onClick: handleOpen, className: "rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1", "aria-label": "Open in new tab", title: "Open", children: _jsx(ExternalLink, { size: 14 }) })), _jsx("button", { onClick: handleCopy, className: "rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--color-primary-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1", "aria-label": "Copy to clipboard", title: "Copy", children: _jsx(Copy, { size: 14 }) }), onDelete && (_jsx("button", { onClick: () => onDelete(memory.id), className: "rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1", "aria-label": "Delete memory", title: "Delete", children: _jsx(X, { size: 14 }) }))] })] }) }) }));
}
export function ResearchMemoryPanel({ open, onClose, onCreateMemory }) {
    const tokens = useTokens();
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState('all');
    const [displayMode, setDisplayMode] = useState('expanded');
    const [sortMode, setSortMode] = useState('newest');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [semanticResults, setSemanticResults] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    // Reserved for future timeline view
    // const [timelineCollapsed, setTimelineCollapsed] = useState(false);
    const [_focusedIndex, setFocusedIndex] = useState(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const debouncedQuery = useDebounce(searchQuery, 300);
    // Keyboard shortcuts
    useEffect(() => {
        if (!open)
            return;
        const handleKeyDown = (e) => {
            // Focus search with /
            if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            // Create memory with n
            if ((e.key === 'n' || e.key === 'N') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCreateDialogOpen(true);
                return;
            }
            // Navigate list with j/k (vim-style)
            if (e.key === 'j' && !(e.target instanceof HTMLInputElement)) {
                e.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev === null ? 0 : Math.min(prev + 1, events.length - 1);
                    // Scroll into view
                    if (listRef.current) {
                        const item = listRef.current.children[next];
                        item?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    return next;
                });
                return;
            }
            if (e.key === 'k' && !(e.target instanceof HTMLInputElement)) {
                e.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev === null ? events.length - 1 : Math.max(prev - 1, 0);
                    if (listRef.current) {
                        const item = listRef.current.children[next];
                        item?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    return next;
                });
                return;
            }
            // Escape to close
            if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) {
                onClose();
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, events.length, onCreateMemory, onClose]);
    // Load events
    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            const loaded = await MemoryStoreInstance.getEvents({
                limit: 500,
            });
            setEvents(loaded);
        }
        catch (error) {
            console.error('[ResearchMemoryPanel] Failed to load events:', error);
            showToast('error', 'Failed to load memories');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        if (!open)
            return;
        void loadEvents();
    }, [open, loadEvents]);
    // Refresh after memory creation
    const handleMemoryCreated = useCallback(() => {
        void loadEvents();
    }, [loadEvents]);
    // Load tags
    useEffect(() => {
        if (!open)
            return;
        const loadTags = async () => {
            try {
                const tags = await superMemoryDB.getAllTags();
                setAllTags(tags);
            }
            catch (error) {
                console.error('[ResearchMemoryPanel] Failed to load tags:', error);
            }
        };
        void loadTags();
    }, [open]);
    // Semantic search
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 3) {
            setSemanticResults([]);
            return;
        }
        const performSemanticSearch = async () => {
            try {
                const results = await semanticSearchMemories(debouncedQuery, {
                    limit: 50,
                    minSimilarity: 0.5,
                });
                setSemanticResults(results);
            }
            catch (error) {
                console.error('[ResearchMemoryPanel] Semantic search failed:', error);
                setSemanticResults([]);
            }
        };
        void performSemanticSearch();
    }, [debouncedQuery]);
    // Filter and sort events
    const filteredEvents = useMemo(() => {
        let filtered = events;
        // Mode filter
        if (mode === 'research') {
            filtered = filtered.filter(e => e.metadata?.tags?.some((t) => t.includes('research') || t.includes('#research')));
        }
        else if (mode === 'trade') {
            filtered = filtered.filter(e => e.metadata?.tags?.some((t) => t.includes('trade') || t.includes('#trade')));
        }
        // Tag filter
        if (selectedTags.length > 0) {
            filtered = filtered.filter(e => selectedTags.some(tag => e.metadata?.tags?.includes(tag)));
        }
        // Search filter
        if (debouncedQuery) {
            if (semanticResults.length > 0) {
                const semanticIds = new Set(semanticResults.map(r => r.event.id));
                filtered = filtered.filter(e => semanticIds.has(e.id));
            }
            else {
                const queryLower = debouncedQuery.toLowerCase();
                filtered = filtered.filter(e => e.value.toLowerCase().includes(queryLower) ||
                    e.metadata?.title?.toLowerCase().includes(queryLower) ||
                    e.metadata?.tags?.some((t) => t.toLowerCase().includes(queryLower)));
            }
        }
        // Sort
        filtered = [...filtered].sort((a, b) => {
            if (sortMode === 'newest')
                return b.ts - a.ts;
            if (sortMode === 'oldest')
                return a.ts - b.ts;
            if (sortMode === 'relevance' && semanticResults.length > 0) {
                const aMatch = semanticResults.find(r => r.event.id === a.id);
                const bMatch = semanticResults.find(r => r.event.id === b.id);
                if (aMatch && bMatch)
                    return bMatch.similarity - aMatch.similarity;
                if (aMatch)
                    return -1;
                if (bMatch)
                    return 1;
            }
            return b.ts - a.ts;
        });
        return filtered;
    }, [events, mode, selectedTags, debouncedQuery, semanticResults, sortMode]);
    const handleTogglePin = async (id, pinned) => {
        try {
            await superMemoryDB.updateEventMetadata(id, { pinned });
            setEvents(prev => prev.map(e => (e.id === id ? { ...e, metadata: { ...e.metadata, pinned } } : e)));
            showToast('success', pinned ? 'Memory pinned' : 'Memory unpinned');
        }
        catch (error) {
            console.error('[ResearchMemoryPanel] Failed to toggle pin:', error);
            showToast('error', 'Failed to update memory');
        }
    };
    const handleCopy = useCallback((_memory) => {
        // Already handled in MemoryCard
    }, []);
    const handleOpen = useCallback(async (memory) => {
        if (memory.metadata?.url) {
            try {
                await ipc.tabs.create({ url: memory.metadata.url });
                showToast('success', 'Opened in new tab');
            }
            catch (error) {
                console.error('[ResearchMemoryPanel] Failed to open tab:', error);
                showToast('error', 'Failed to open in new tab');
            }
        }
    }, []);
    const handleDelete = async (id) => {
        try {
            await superMemoryDB.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
            showToast('success', 'Memory deleted');
        }
        catch (error) {
            console.error('[ResearchMemoryPanel] Failed to delete event:', error);
            showToast('error', 'Failed to delete memory');
        }
    };
    const handleToggleTag = (tag) => {
        setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
    };
    // Group by date for timeline (reserved for future timeline view)
    // const groupedByDate = useMemo(() => {
    //   const groups = new Map<string, MemoryEvent[]>();
    //   for (const event of filteredEvents) {
    //     const date = new Date(event.ts);
    //     const dateKey = date.toLocaleDateString();
    //     if (!groups.has(dateKey)) {
    //       groups.set(dateKey, []);
    //     }
    //     groups.get(dateKey)!.push(event);
    //   }
    //   return Array.from(groups.entries()).sort(
    //     (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    //   );
    // }, [filteredEvents]);
    if (!open)
        return null;
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, className: "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm", "aria-hidden": "true" }), _jsxs(motion.div, { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: { type: 'spring', damping: 25, stiffness: 200 }, className: "fixed bottom-0 right-0 top-0 z-50 flex w-0 max-w-[90vw] flex-col overflow-hidden border-l border-[var(--surface-border)] bg-[var(--surface-root)] shadow-2xl backdrop-blur-xl sm:max-w-full md:w-[420px] md:overflow-visible", role: "dialog", "aria-modal": "true", "aria-label": "Research Memory Panel", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[var(--surface-border)]", style: { padding: tokens.spacing(4) }, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FileText, { size: 20, className: "text-[var(--color-primary-400)]" }), _jsx("h2", { className: "font-semibold text-[var(--text-primary)]", style: { fontSize: tokens.fontSize.lg }, children: "SuperMemory" })] }), _jsx("button", { onClick: onClose, className: "rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]", "aria-label": "Close panel", children: _jsx(X, { size: 18 }) })] }), _jsx("div", { style: { padding: tokens.spacing(4), paddingBottom: tokens.spacing(3) }, children: _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 16, className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" }), _jsx("input", { ref: searchInputRef, type: "text", placeholder: "Search memories... (Press / to focus)", value: searchQuery, onChange: e => setSearchQuery(e.target.value), className: "w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] py-2 pl-10 pr-4 text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]", style: { fontSize: tokens.fontSize.sm }, "aria-label": "Search memories" })] }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-[var(--surface-border)]", style: {
                                padding: tokens.spacing(4),
                                paddingTop: tokens.spacing(2),
                                paddingBottom: tokens.spacing(3),
                            }, children: [['all', 'research', 'trade'].map(m => (_jsx("button", { onClick: () => setMode(m), className: `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${mode === m
                                        ? 'bg-[var(--color-primary-600)] text-white'
                                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'} focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1`, style: { fontSize: tokens.fontSize.sm }, "aria-pressed": mode === m, children: m.charAt(0).toUpperCase() + m.slice(1) }, m))), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsx("button", { onClick: () => setDisplayMode(displayMode === 'compact' ? 'expanded' : 'compact'), className: "rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]", "aria-label": `Switch to ${displayMode === 'compact' ? 'expanded' : 'compact'} view`, title: displayMode === 'compact' ? 'Expanded view' : 'Compact view', children: displayMode === 'compact' ? _jsx(List, { size: 16 }) : _jsx(LayoutGrid, { size: 16 }) }), _jsxs("div", { className: "text-sm text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.sm }, children: [filteredEvents.length, " ", filteredEvents.length === 1 ? 'item' : 'items'] })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-[var(--surface-border)]", style: {
                                padding: tokens.spacing(3),
                                paddingTop: tokens.spacing(2),
                                paddingBottom: tokens.spacing(2),
                            }, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Filter, { size: 14, className: "text-[var(--text-muted)]" }), _jsx("span", { className: "text-xs text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.xs }, children: "Sort:" }), _jsxs("select", { value: sortMode, onChange: e => setSortMode(e.target.value), className: "rounded-md border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]", style: { fontSize: tokens.fontSize.xs }, "aria-label": "Sort mode", children: [_jsx("option", { value: "newest", children: "Newest" }), _jsx("option", { value: "oldest", children: "Oldest" }), _jsx("option", { value: "relevance", children: "Relevance" })] })] }), allTags.slice(0, 5).map(tag => (_jsxs("button", { onClick: () => handleToggleTag(tag), className: `rounded-full px-2 py-1 text-xs font-medium transition-colors ${selectedTags.includes(tag)
                                        ? 'bg-[var(--color-primary-600)] text-white'
                                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'} focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1`, style: { fontSize: tokens.fontSize.xs }, "aria-pressed": selectedTags.includes(tag), children: ["#", tag] }, tag))), selectedTags.length > 0 && (_jsx("button", { onClick: () => setSelectedTags([]), className: "rounded-full px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]", style: { fontSize: tokens.fontSize.xs }, children: "Clear" }))] }), _jsx("div", { className: "flex-1 overflow-y-auto", "aria-busy": loading, children: loading ? (_jsx("div", { style: { padding: tokens.spacing(4) }, children: _jsx(SkeletonList, { items: 5 }) })) : filteredEvents.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-2xl border border-[var(--surface-border)] bg-gradient-to-br from-[#281b5f] via-[#152038] to-[#0f172a] text-center text-white shadow-inner shadow-black/30", style: { padding: tokens.spacing(8), minHeight: '300px' }, children: [_jsx(FileText, { size: 48, className: "mb-4 text-purple-200" }), _jsx("p", { className: "mb-2 text-2xl font-semibold", children: "Welcome to Research Mode" }), _jsx("p", { className: "mb-4 max-w-md text-sm text-purple-100/80", children: "Ask Regen in Hindi, Tamil, Bengali, or English. Your best answers and agent handoffs land here automatically." }), _jsxs("button", { type: "button", onClick: () => window.dispatchEvent(new CustomEvent('research:quickstart', {
                                            detail: { query: 'Compare Nifty vs BankNifty for intraday' },
                                        })), className: "inline-flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-[#0f172a] transition hover:bg-white", children: ["Try \u201CCompare Nifty vs BankNifty\u201D", _jsx(ChevronRight, { size: 16 })] })] })) : (_jsx("ul", { ref: listRef, className: "flex flex-col gap-3", style: { padding: tokens.spacing(4) }, role: "list", children: _jsx(AnimatePresence, { mode: "popLayout", children: filteredEvents.map(event => (_jsx(MemoryCard, { memory: event, compact: displayMode === 'compact', onPin: handleTogglePin, onCopy: handleCopy, onOpen: handleOpen, onDelete: handleDelete }, event.id))) }) })) }), _jsxs("div", { className: "flex items-center gap-2 border-t border-[var(--surface-border)]", style: { padding: tokens.spacing(4) }, children: [_jsx(Button, { tone: "primary", size: "sm", icon: _jsx(Plus, { size: 16 }), onClick: () => setCreateDialogOpen(true), fullWidth: true, className: "flex-1", children: "Create Memory" }), _jsx(Button, { tone: "secondary", size: "sm", onClick: () => setExportDialogOpen(true), children: "Export" })] })] }), _jsx(CreateMemoryDialog, { open: createDialogOpen, onClose: () => setCreateDialogOpen(false), onCreated: handleMemoryCreated }), _jsx(ExportMemoriesDialog, { open: exportDialogOpen, onClose: () => setExportDialogOpen(false), events: events, availableTags: allTags })] })) }));
}
