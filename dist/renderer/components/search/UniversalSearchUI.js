import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Universal Search UI - Real-time search across all sources
 */
import { useState, useEffect, useRef } from 'react';
import { Search, Clock, Bookmark, FileText, Folder, Tag, X } from 'lucide-react';
import { UniversalSearch } from '../../core/search/UniversalSearch';
import { ipc } from '../../lib/ipc-typed';
export function UniversalSearchUI() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const debouncedSearch = UniversalSearch.createSearchDebounced(300);
    useEffect(() => {
        // Keyboard shortcut: Ctrl+K or Cmd+K
        const handleKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setQuery('');
                setResults([]);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen]);
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);
    useEffect(() => {
        if (query.trim().length === 0) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        debouncedSearch(query, (searchResults) => {
            setResults(searchResults);
            setIsSearching(false);
            setSelectedIndex(0);
        });
    }, [query]);
    const handleResultClick = async (result) => {
        if (result.url) {
            await ipc.tabs.create(result.url);
        }
        else if (result.type === 'session') {
            // Load session
            const sessionId = result.id.replace('session_', '');
            // Trigger session load event
            window.dispatchEvent(new CustomEvent('load-session', { detail: { sessionId } }));
        }
        setIsOpen(false);
        setQuery('');
        setResults([]);
    };
    const getResultIcon = (type) => {
        switch (type) {
            case 'history':
                return _jsx(Clock, { className: "w-4 h-4" });
            case 'bookmark':
                return _jsx(Bookmark, { className: "w-4 h-4" });
            case 'session':
                return _jsx(Folder, { className: "w-4 h-4" });
            case 'note':
                return _jsx(FileText, { className: "w-4 h-4" });
            case 'tab':
                return _jsx(Tag, { className: "w-4 h-4" });
            default:
                return _jsx(Search, { className: "w-4 h-4" });
        }
    };
    const getResultTypeLabel = (type) => {
        switch (type) {
            case 'history':
                return 'History';
            case 'bookmark':
                return 'Bookmark';
            case 'session':
                return 'Session';
            case 'note':
                return 'Note';
            case 'tab':
                return 'Open Tab';
            default:
                return 'Result';
        }
    };
    if (!isOpen)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 bg-black/50 z-[9998]", onClick: () => {
                    setIsOpen(false);
                    setQuery('');
                    setResults([]);
                } }), _jsx("div", { className: "fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-[9999]", children: _jsxs("div", { className: "bg-gray-900 border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-3 p-4 border-b border-gray-700", children: [_jsx(Search, { className: "w-5 h-5 text-gray-400" }), _jsx("input", { ref: inputRef, type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: "Search history, bookmarks, sessions, notes...", className: "flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg", onKeyDown: e => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                                        }
                                        else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setSelectedIndex(prev => Math.max(prev - 1, 0));
                                        }
                                        else if (e.key === 'Enter' && results[selectedIndex]) {
                                            e.preventDefault();
                                            handleResultClick(results[selectedIndex]);
                                        }
                                    } }), query && (_jsx("button", { onClick: () => {
                                        setQuery('');
                                        setResults([]);
                                    }, className: "p-1 text-gray-400 hover:text-white", children: _jsx(X, { className: "w-4 h-4" }) })), _jsx("kbd", { className: "px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded border border-gray-700", children: "Esc" })] }), _jsx("div", { className: "max-h-96 overflow-y-auto", children: isSearching && query ? (_jsxs("div", { className: "p-8 text-center text-gray-400", children: [_jsx("div", { className: "w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" }), _jsx("p", { className: "text-sm", children: "Searching..." })] })) : results.length === 0 && query ? (_jsxs("div", { className: "p-8 text-center text-gray-400", children: [_jsx(Search, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "No results found" })] })) : results.length > 0 ? (_jsx("div", { className: "py-2", children: results.map((result, index) => (_jsxs("button", { onClick: () => handleResultClick(result), className: `w-full flex items-start gap-3 p-3 hover:bg-gray-800 transition-colors text-left ${index === selectedIndex ? 'bg-gray-800' : ''}`, children: [_jsx("div", { className: "flex-shrink-0 text-purple-400 mt-0.5", children: getResultIcon(result.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("p", { className: "text-sm font-medium text-white truncate", children: result.title }), _jsx("span", { className: "text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded", children: getResultTypeLabel(result.type) })] }), result.url && (_jsx("p", { className: "text-xs text-gray-400 truncate mb-1", children: result.url })), _jsx("p", { className: "text-xs text-gray-500 line-clamp-2", dangerouslySetInnerHTML: { __html: result.snippet } }), result.timestamp && (_jsx("p", { className: "text-xs text-gray-600 mt-1", children: new Date(result.timestamp).toLocaleDateString() }))] })] }, result.id))) })) : (_jsxs("div", { className: "p-8 text-center text-gray-400", children: [_jsx(Search, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm mb-2", children: "Universal Search" }), _jsx("p", { className: "text-xs text-gray-500", children: "Search across history, bookmarks, sessions, notes, and tabs" }), _jsxs("p", { className: "text-xs text-gray-600 mt-4", children: ["Press ", _jsx("kbd", { className: "px-2 py-1 bg-gray-800 rounded border border-gray-700", children: "Ctrl+K" }), " to open"] })] })) })] }) })] }));
}
