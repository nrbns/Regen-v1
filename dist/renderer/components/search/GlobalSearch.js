import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Global Search Component - Ctrl+K / Cmd+K
// Full-text search across Tabs, Notes, Research, Charts
// Supports Hindi + English
import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, FileText, Globe, BookOpen, BarChart3, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '../../state/tabsStore';
import { multiSearch } from '../../lib/meili';
import { getDocumentCommands } from '../command-palette/DocumentCommands';
export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const { tabs, setActive } = useTabsStore();
    const navigate = useNavigate();
    // Get document commands
    const docCommands = useMemo(() => getDocumentCommands(navigate), [navigate]);
    // Multi-search across all indexes + document commands
    async function performSearch(searchQuery) {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const allResults = [];
            // 1. Search document commands (local, fast)
            const queryLower = searchQuery.toLowerCase();
            const matchingCommands = docCommands.filter(cmd => {
                const searchable = `${cmd.title} ${cmd.description} ${cmd.keywords.join(' ')}`.toLowerCase();
                return searchable.includes(queryLower);
            });
            matchingCommands.forEach(cmd => {
                allResults.push({
                    id: cmd.id,
                    title: cmd.title,
                    content: cmd.description,
                    _index: 'commands',
                    command: cmd,
                });
            });
            // 2. Use MeiliSearch multi-search function for content
            try {
                const data = await multiSearch([
                    { indexUid: 'tabs', q: searchQuery, limit: 5 },
                    { indexUid: 'notes', q: searchQuery, limit: 5 },
                    { indexUid: 'research', q: searchQuery, limit: 5 },
                    { indexUid: 'charts', q: searchQuery, limit: 5 },
                ]);
                if (data.results && Array.isArray(data.results)) {
                    data.results.forEach((result) => {
                        if (result.hits && Array.isArray(result.hits)) {
                            result.hits.forEach((hit) => {
                                allResults.push({
                                    ...hit,
                                    _index: result.indexUid,
                                });
                            });
                        }
                    });
                }
            }
            catch {
                // MeiliSearch not available, continue with commands only
                console.debug('[GlobalSearch] MeiliSearch not available');
            }
            setResults(allResults);
            setSelectedIndex(0);
        }
        catch (error) {
            console.error('[GlobalSearch] Search error:', error);
            setResults([]);
        }
        finally {
            setLoading(false);
        }
    }
    // Debounced search
    useEffect(() => {
        if (!open)
            return;
        const timeoutId = setTimeout(() => {
            performSearch(query);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [query, open]);
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+K or Cmd+K to open
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
            // Escape to close
            if (e.key === 'Escape' && open) {
                setOpen(false);
                setQuery('');
                setResults([]);
            }
            // Arrow keys to navigate
            if (open && results.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                }
                else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                }
                else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < results.length) {
                    e.preventDefault();
                    handleResultClick(results[selectedIndex]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, results, selectedIndex]);
    // Auto-focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);
    const handleResultClick = (result) => {
        // Handle document commands
        if (result._index === 'commands' && result.command) {
            const cmd = result.command;
            cmd.action();
            setOpen(false);
            setQuery('');
            setResults([]);
            return;
        }
        if (result._index === 'tabs' && result.url) {
            // Find or create tab
            const existingTab = tabs.find(t => t.url === result.url);
            if (existingTab) {
                setActive(existingTab.id);
            }
            else {
                // Create new tab
                useTabsStore.getState().add({
                    id: `tab-${Date.now()}`,
                    title: result.title || 'New Tab',
                    url: result.url,
                });
            }
        }
        else if (result._index === 'notes' || result._index === 'research') {
            // Open in research mode or notes view
            // TODO: Implement navigation to notes/research
            console.log('Open note/research:', result);
        }
        else if (result._index === 'charts') {
            // Open chart
            // TODO: Implement chart navigation
            console.log('Open chart:', result);
        }
        setOpen(false);
        setQuery('');
        setResults([]);
    };
    const getResultIcon = (result) => {
        // Use command icon if available
        if (result._index === 'commands' && result.command) {
            const Icon = result.command.icon;
            return _jsx(Icon, { size: 16, className: "text-cyan-400" });
        }
        switch (result._index) {
            case 'tabs':
                return _jsx(Globe, { size: 16, className: "text-blue-400" });
            case 'notes':
                return _jsx(FileText, { size: 16, className: "text-green-400" });
            case 'research':
                return _jsx(BookOpen, { size: 16, className: "text-purple-400" });
            case 'charts':
                return _jsx(BarChart3, { size: 16, className: "text-yellow-400" });
            case 'commands':
                return _jsx(FileText, { size: 16, className: "text-cyan-400" });
            default:
                return _jsx(Search, { size: 16, className: "text-gray-400" });
        }
    };
    const getResultTitle = (result) => {
        return result.title || result.content || result.symbol || 'Untitled';
    };
    return (_jsx(AnimatePresence, { children: open && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[99999] flex items-start justify-center bg-black/70 pt-32 backdrop-blur-sm", onClick: () => {
                setOpen(false);
                setQuery('');
                setResults([]);
            }, children: _jsxs(motion.div, { initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.95, opacity: 0 }, className: "w-full max-w-3xl overflow-hidden rounded-2xl border border-purple-800 bg-gray-900 shadow-2xl", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center gap-4 border-b border-gray-800 px-6 py-4", children: [_jsx(Search, { size: 20, className: "text-purple-400" }), _jsx("input", { ref: inputRef, id: "global-search-input", name: "global-search-query", type: "text", placeholder: "Search tabs, notes, charts, research\u2026 (Hindi bhi chalega)", className: "flex-1 bg-transparent text-lg text-white placeholder-purple-400 outline-none", value: query, onChange: e => setQuery(e.target.value), onKeyDown: e => {
                                    if (e.key === 'Escape') {
                                        setOpen(false);
                                        setQuery('');
                                        setResults([]);
                                    }
                                } }), query && (_jsx("button", { onClick: () => {
                                    setQuery('');
                                    setResults([]);
                                    inputRef.current?.focus();
                                }, className: "text-gray-400 hover:text-white", children: _jsx(X, { size: 18 }) }))] }), _jsx("div", { className: "max-h-96 overflow-y-auto", children: loading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-b-2 border-purple-400" }) })) : results.length === 0 && query.length >= 2 ? (_jsxs("div", { className: "py-12 text-center text-gray-500", children: ["No results found for \"", query, "\""] })) : results.length === 0 ? (_jsxs("div", { className: "py-12 text-center text-gray-500", children: [_jsx("p", { className: "mb-2", children: "Type to search..." }), _jsx("p", { className: "text-sm text-gray-600", children: "Search across tabs, notes, research, and charts" })] })) : (results.map((result, index) => (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.05 }, className: `flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors ${index === selectedIndex
                                ? 'border-l-2 border-purple-400 bg-purple-900/50'
                                : 'hover:bg-purple-900/30'}`, onClick: () => handleResultClick(result), onMouseEnter: () => setSelectedIndex(index), children: [getResultIcon(result), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("span", { className: "text-xs font-medium uppercase text-purple-400", children: result._index }), result.timestamp && (_jsxs("span", { className: "text-xs text-gray-500", children: [_jsx(Clock, { size: 12, className: "mr-1 inline" }), new Date(result.timestamp).toLocaleDateString()] }))] }), _jsx("div", { className: "truncate font-medium text-white", children: getResultTitle(result) }), result.content && result.content !== getResultTitle(result) && (_jsxs("div", { className: "mt-1 truncate text-sm text-gray-400", children: [result.content.slice(0, 100), result.content.length > 100 ? '...' : ''] })), result.url && (_jsx("div", { className: "mt-1 truncate text-xs text-gray-500", children: result.url }))] })] }, `${result._index}-${result.id}`)))) }), results.length > 0 && (_jsxs("div", { className: "flex items-center justify-between border-t border-gray-800 px-6 py-3 text-xs text-gray-500", children: [_jsx("span", { children: "\u2191\u2193 Navigate \u2022 Enter Select \u2022 Esc Close" }), _jsxs("span", { children: [results.length, " result", results.length !== 1 ? 's' : ''] })] }))] }) })) }));
}
