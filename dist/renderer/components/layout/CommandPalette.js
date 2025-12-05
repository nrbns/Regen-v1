import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CommandPalette - ⌘K command overlay
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Box, Clock, Sparkles, History } from 'lucide-react';
import { getAllCommands, onCommandsChanged } from '../../lib/commands/registry';
import { initializeBuiltinCommands, builtinsInitialized } from '../../lib/commands/builtin';
import { commandHistory } from '../../lib/commands/history';
import { ipc } from '../../lib/ipc-typed';
import { useContainerStore } from '../../state/containerStore';
import { ipcEvents } from '../../lib/ipc-events';
const DEFAULT_SEARCH_ENGINE = 'https://duckduckgo.com/?q=';
const TYPE_PRIORITY = {
    action: 0,
    command: 1,
    container: 2,
    tab: 3,
    history: 4,
};
const PROTOCOL_REGEX = /^(https?:\/\/|chrome:\/\/|edge:\/\/|about:|file:\/\/)/i;
const DOMAIN_REGEX = /^[\w.-]+\.[a-z]{2,}(?:[\/?#].*)?$/i;
const withAlpha = (hex, alpha = '33') => {
    if (!hex || !hex.startsWith('#'))
        return undefined;
    if (hex.length === 4) {
        const r = hex[1];
        const g = hex[2];
        const b = hex[3];
        return `#${r}${r}${g}${g}${b}${b}${alpha}`;
    }
    if (hex.length === 7) {
        return `${hex}${alpha}`;
    }
    return hex;
};
const capitalize = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
const buildNavigationTarget = (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
        return { url: 'about:blank', description: 'Open a blank tab', isDirect: true };
    }
    if (PROTOCOL_REGEX.test(trimmed)) {
        return { url: trimmed, description: trimmed, isDirect: true };
    }
    if (!/\s/.test(trimmed) && DOMAIN_REGEX.test(trimmed)) {
        const url = trimmed.startsWith('www.') ? `https://${trimmed}` : `https://${trimmed}`;
        return { url, description: url, isDirect: true };
    }
    return {
        url: `${DEFAULT_SEARCH_ENGINE}${encodeURIComponent(trimmed)}`,
        description: `Search the web for “${trimmed}”`,
        isDirect: false,
    };
};
/**
 * Enhanced fuzzy search algorithm
 */
function fuzzyScore(query, value) {
    if (!value)
        return 0;
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedValue = value.toLowerCase();
    // Exact match gets highest score
    if (normalizedValue === normalizedQuery) {
        return 1000;
    }
    // Prefix match gets high score
    if (normalizedValue.startsWith(normalizedQuery)) {
        return 500;
    }
    // Word boundary match
    const words = normalizedValue.split(/\s+/);
    const queryWords = normalizedQuery.split(/\s+/);
    let wordBoundaryScore = 0;
    for (const qWord of queryWords) {
        for (const word of words) {
            if (word.startsWith(qWord)) {
                wordBoundaryScore += 100;
                break;
            }
        }
    }
    if (wordBoundaryScore > 0) {
        return wordBoundaryScore;
    }
    // Character sequence match
    let score = 0;
    let queryIndex = 0;
    let lastMatchIndex = -1;
    let consecutiveMatches = 0;
    for (let i = 0; i < normalizedValue.length && queryIndex < normalizedQuery.length; i++) {
        if (normalizedValue[i] === normalizedQuery[queryIndex]) {
            score += 5;
            if (lastMatchIndex === i - 1) {
                consecutiveMatches++;
                score += 3 * consecutiveMatches; // Consecutive bonus (increasing)
            }
            else {
                consecutiveMatches = 1;
            }
            if (i === 0) {
                score += 10; // Prefix bonus
            }
            lastMatchIndex = i;
            queryIndex++;
        }
    }
    if (queryIndex === normalizedQuery.length) {
        score += 10; // Matched all characters
    }
    // Penalty for unmatched characters
    const unmatchedRatio = (normalizedValue.length - queryIndex) / normalizedValue.length;
    score = Math.max(0, score - (unmatchedRatio * 5));
    return score;
}
function scorePaletteItem(query, item, usageCount = 0) {
    const fields = [
        item.title,
        item.subtitle,
        item.category,
        item.badge,
        ...(item.keywords ?? []),
    ];
    let best = 0;
    for (const field of fields) {
        const current = fuzzyScore(query, field);
        if (current > best) {
            best = current;
        }
    }
    // Boost score based on usage history
    if (usageCount > 0) {
        best += Math.min(usageCount * 2, 20); // Max 20 point boost
    }
    return best;
}
export function CommandPalette({ onClose }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [commands, setCommands] = useState([]);
    const [loading, setLoading] = useState(!builtinsInitialized());
    const [recentHistory, setRecentHistory] = useState([]);
    const [historySearchResults, setHistorySearchResults] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [openTabs, setOpenTabs] = useState([]);
    const [showRecentCommands, setShowRecentCommands] = useState(false);
    const { containers, activeContainerId, setContainers, setActiveContainer } = useContainerStore((state) => ({
        containers: state.containers,
        activeContainerId: state.activeContainerId,
        setContainers: state.setContainers,
        setActiveContainer: state.setActiveContainer,
    }));
    const containersRef = useRef(containers);
    const inputRef = useRef(null);
    useEffect(() => {
        containersRef.current = containers;
    }, [containers]);
    useEffect(() => {
        if (!builtinsInitialized()) {
            initializeBuiltinCommands();
        }
        let mounted = true;
        const loadCommands = async () => {
            const list = await getAllCommands();
            if (!mounted)
                return;
            setCommands(list);
            setLoading(false);
            setSelectedIndex(0);
        };
        void loadCommands();
        const unsubscribe = onCommandsChanged(() => {
            void loadCommands();
        });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);
    useEffect(() => {
        let mounted = true;
        const loadRecent = async () => {
            try {
                const list = await ipc.history.list();
                if (mounted) {
                    setRecentHistory(Array.isArray(list) ? list.slice(0, 20) : []);
                }
            }
            catch (error) {
                console.warn('[CommandPalette] Failed to load history list:', error);
            }
        };
        void loadRecent();
        return () => {
            mounted = false;
        };
    }, []);
    useEffect(() => {
        let cancelled = false;
        if (containers.length === 0) {
            ipc.containers
                .list()
                .then((list) => {
                if (!cancelled && Array.isArray(list)) {
                    setContainers(list);
                }
            })
                .catch((error) => {
                console.warn('[CommandPalette] Failed to load containers:', error);
            });
        }
        const unsubscribeList = ipcEvents.on('containers:list', (payload) => {
            if (Array.isArray(payload)) {
                setContainers(payload);
            }
        });
        const unsubscribeActive = ipcEvents.on('containers:active', (payload) => {
            if (!payload)
                return;
            const next = payload.container ?? containersRef.current.find((c) => c.id === payload.containerId);
            if (next) {
                setActiveContainer(next);
            }
        });
        return () => {
            cancelled = true;
            unsubscribeList();
            unsubscribeActive();
        };
    }, [containers.length, setContainers, setActiveContainer]);
    useEffect(() => {
        let cancelled = false;
        const loadTabs = async () => {
            try {
                const list = await ipc.tabs.list();
                if (!cancelled && Array.isArray(list)) {
                    setOpenTabs(list);
                }
            }
            catch (error) {
                console.warn('[CommandPalette] Failed to load tabs:', error);
            }
        };
        void loadTabs();
        const unsubscribeTabs = ipcEvents.on('tabs:updated', (payload) => {
            if (Array.isArray(payload)) {
                setOpenTabs(payload);
            }
        });
        return () => {
            cancelled = true;
            unsubscribeTabs();
        };
    }, []);
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setHistorySearchResults([]);
            setHistoryLoading(false);
            return;
        }
        let cancelled = false;
        setHistoryLoading(true);
        const runSearch = async () => {
            try {
                const results = await ipc.history.search(trimmed);
                if (!cancelled) {
                    setHistorySearchResults(Array.isArray(results) ? results.slice(0, 20) : []);
                }
            }
            catch (error) {
                if (!cancelled) {
                    console.warn('[CommandPalette] History search failed:', error);
                    setHistorySearchResults([]);
                }
            }
            finally {
                if (!cancelled) {
                    setHistoryLoading(false);
                }
            }
        };
        void runSearch();
        return () => {
            cancelled = true;
        };
    }, [query]);
    const filteredItems = useMemo(() => {
        const trimmed = query.trim();
        const normalized = trimmed.toLowerCase();
        const historySource = normalized.length >= 2 ? historySearchResults : recentHistory;
        // Get command usage counts for scoring
        const usageCounts = new Map();
        for (const cmd of commands) {
            usageCounts.set(cmd.id, commandHistory.getUsageCount(cmd.id));
        }
        const commandItems = commands.map((cmd) => ({
            id: cmd.id,
            title: cmd.title,
            subtitle: cmd.subtitle,
            category: cmd.category,
            type: 'command',
            keywords: cmd.keywords,
            shortcut: cmd.shortcut,
            badge: cmd.badge,
            run: async () => {
                commandHistory.record(cmd.id, trimmed);
                await cmd.run();
            },
            meta: { usageCount: usageCounts.get(cmd.id) || 0 },
        }));
        const containerItems = containers.map((container) => ({
            id: `container:${container.id}`,
            title: `Switch to ${container.name}`,
            subtitle: container.description || `${capitalize(container.scope ?? 'session')} container`,
            category: 'Containers',
            type: 'container',
            badge: container.id === activeContainerId ? 'Active' : undefined,
            keywords: [container.name, container.description ?? '', container.id, container.scope ?? ''],
            meta: { color: container.color, container },
            run: async () => {
                try {
                    const result = await ipc.containers.setActive(container.id);
                    const info = (result || container);
                    setActiveContainer(info);
                }
                catch (error) {
                    console.warn('[CommandPalette] Failed to switch container:', error);
                }
            },
        }));
        const tabItems = openTabs.map((tab) => ({
            id: `tab:${tab.id}`,
            title: tab.title || tab.url || 'Untitled tab',
            subtitle: tab.url,
            category: 'Open Tabs',
            type: 'tab',
            badge: tab.active ? 'Current Tab' : tab.containerName,
            keywords: [tab.title ?? '', tab.url ?? '', tab.containerName ?? '', tab.mode ?? ''],
            meta: { color: tab.containerColor, active: tab.active },
            run: async () => {
                await ipc.tabs.activate({ id: tab.id });
            },
        }));
        const historyItems = historySource.map((entry) => ({
            id: `history:${entry.id}`,
            title: entry.title || entry.url,
            subtitle: entry.url,
            category: 'History',
            type: 'history',
            badge: entry.visitCount ? `${entry.visitCount}×` : undefined,
            keywords: [entry.url, entry.title],
            run: async () => {
                if (!entry.url)
                    return;
                await ipc.tabs.create({ url: entry.url });
            },
        }));
        const openInContainerItems = trimmed.length > 0
            ? containers.map((container) => {
                const target = buildNavigationTarget(trimmed);
                return {
                    id: `open:${container.id}:${trimmed}`,
                    title: target.isDirect
                        ? `Open ${target.url} in ${container.name}`
                        : `Search “${trimmed}” in ${container.name}`,
                    subtitle: target.description,
                    category: 'Open in Container',
                    type: 'action',
                    badge: 'New Tab',
                    keywords: [trimmed, container.name, container.id],
                    meta: { color: container.color },
                    run: async () => {
                        await ipc.tabs.create({ url: target.url, containerId: container.id });
                    },
                };
            })
            : [];
        const combined = [
            ...openInContainerItems,
            ...commandItems,
            ...containerItems,
            ...tabItems,
            ...historyItems,
        ];
        if (!normalized) {
            return combined.slice(0, 30);
        }
        const scored = combined
            .map((item) => ({
            item,
            score: scorePaletteItem(normalized, item, item.meta?.usageCount || 0),
        }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            const orderA = TYPE_PRIORITY[a.item.type] ?? 99;
            const orderB = TYPE_PRIORITY[b.item.type] ?? 99;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a.item.title.localeCompare(b.item.title);
        })
            .slice(0, 30)
            .map(({ item }) => item);
        return scored;
    }, [query, commands, containers, activeContainerId, openTabs, historySearchResults, recentHistory, setActiveContainer]);
    // Recent commands when query is empty
    const recentCommands = useMemo(() => {
        if (!showRecentCommands)
            return [];
        const recent = commandHistory.getRecent(10);
        const items = [];
        for (const entry of recent) {
            const cmd = commands.find(c => c.id === entry.commandId);
            if (!cmd)
                continue;
            items.push({
                id: `recent:${entry.commandId}`,
                title: cmd.title,
                subtitle: cmd.subtitle || `Used ${new Date(entry.timestamp).toLocaleDateString()}`,
                category: 'Recent Commands',
                type: 'command',
                keywords: cmd.keywords,
                shortcut: cmd.shortcut,
                badge: 'Recent',
                run: async () => {
                    commandHistory.record(cmd.id);
                    await cmd.run();
                },
                icon: _jsx(History, { size: 14 }),
            });
            if (items.length >= 5)
                break;
        }
        return items;
    }, [showRecentCommands, commands]);
    // Combine recent commands with filtered items
    const displayItems = useMemo(() => {
        if (showRecentCommands && recentCommands.length > 0 && query.trim().length === 0) {
            return [...recentCommands, ...filteredItems.slice(0, 25)];
        }
        return filteredItems;
    }, [showRecentCommands, recentCommands, filteredItems, query]);
    const groupedItems = useMemo(() => {
        const sections = [];
        let currentCategory = '';
        displayItems.forEach((item, index) => {
            if (item && item.category !== currentCategory) {
                currentCategory = item.category;
                sections.push({ category: currentCategory, items: [item], startIndex: index });
            }
            else if (item) {
                sections[sections.length - 1]?.items.push(item);
            }
        });
        return sections;
    }, [displayItems]);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
            else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, Math.max(displayItems.length - 1, 0)));
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (displayItems[selectedIndex]) {
                    void displayItems[selectedIndex].run();
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, displayItems, onClose]);
    useEffect(() => {
        if (selectedIndex >= displayItems.length) {
            setSelectedIndex(displayItems.length > 0 ? displayItems.length - 1 : 0);
        }
    }, [displayItems, selectedIndex]);
    // Show recent commands when query is empty
    useEffect(() => {
        setShowRecentCommands(query.trim().length === 0);
    }, [query]);
    const renderIcon = (item) => {
        const color = typeof item.meta?.color === 'string' ? item.meta.color : undefined;
        const classNameBase = 'inline-flex h-6 w-6 items-center justify-center rounded-lg border text-[11px]';
        const className = color != null
            ? classNameBase
            : `${classNameBase} border-gray-700 bg-gray-800/60 text-gray-300`;
        const style = color != null
            ? {
                borderColor: withAlpha(color, '66') ?? color,
                backgroundColor: withAlpha(color, '22') ?? color,
                color,
            }
            : undefined;
        if (item.icon) {
            return (_jsx("span", { className: className, style: style, children: item.icon }));
        }
        switch (item.type) {
            case 'history':
                return (_jsx("span", { className: className, style: style, children: _jsx(Clock, { size: 14 }) }));
            case 'container':
                return (_jsx("span", { className: className, style: style, children: _jsx(Box, { size: 14 }) }));
            case 'tab':
                return (_jsx("span", { className: className, style: style, children: _jsx(Box, { size: 12 }) }));
            case 'action':
                return (_jsx("span", { className: className, style: style, children: _jsx(Sparkles, { size: 14 }) }));
            default:
                return (_jsx("span", { className: className, style: style, children: _jsx(Sparkles, { size: 14 }) }));
        }
    };
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-50 flex items-start justify-center pt-[15vh]", onClick: onClose, children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }), _jsxs(motion.div, { initial: { scale: 0.95, opacity: 0, y: -20 }, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 0.95, opacity: 0, y: -20 }, onClick: (e) => e.stopPropagation(), className: "relative w-full max-w-2xl mx-4 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-gray-800/50", children: [_jsx(Search, { size: 20, className: "text-gray-400" }), _jsx("input", { ref: inputRef, type: "text", value: query, onChange: (e) => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }, autoFocus: true, placeholder: "Type a command or search...", className: "flex-1 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none" }), _jsx("kbd", { className: "px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400", children: "Esc" })] }), _jsx("div", { className: "max-h-96 overflow-y-auto", children: displayItems.length > 0 ? (_jsx("div", { className: "py-2", children: groupedItems.map((section) => (_jsxs("div", { children: [_jsx("div", { className: "px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-gray-500", children: section.category }), _jsx("div", { className: "flex flex-col", children: section.items.map((cmd, index) => {
                                            const globalIndex = section.startIndex + index;
                                            const isSelected = selectedIndex === globalIndex;
                                            const iconElement = renderIcon(cmd);
                                            return (_jsxs(motion.button, { onClick: async () => {
                                                    await cmd.run();
                                                    onClose();
                                                }, onMouseEnter: () => setSelectedIndex(globalIndex), className: `w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isSelected
                                                    ? 'bg-blue-600/20 border-l-2 border-blue-500'
                                                    : 'hover:bg-gray-800/40 border-l-2 border-transparent'}`, children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [iconElement, _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-200 truncate", children: cmd.title }), cmd.badge && (_jsx("span", { className: "rounded-full border border-gray-700 bg-gray-800/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400", children: cmd.badge }))] }), cmd.subtitle && (_jsx("div", { className: "text-xs text-gray-500 truncate", children: cmd.subtitle }))] })] }), _jsxs("div", { className: "flex items-center gap-2 ml-4 shrink-0", children: [cmd.shortcut && (_jsx("span", { className: "flex items-center gap-1 text-[11px] text-gray-500", children: cmd.shortcut.map((part, idx) => (_jsx("kbd", { className: "rounded border border-gray-700 bg-gray-800/60 px-1.5 py-0.5 text-[10px] text-gray-400", children: part }, `${cmd.id}-sc-${idx}`))) })), _jsx(ArrowRight, { size: 16, className: "text-gray-500" })] })] }, cmd.id));
                                        }) })] }, `section-${section.category}`))) })) : (_jsx("div", { className: "py-8 text-center text-gray-500 text-sm", children: loading || historyLoading ? 'Searching…' : 'No commands found' })) }), _jsxs("div", { className: "px-4 py-2 border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-500", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { children: "\u2191\u2193 Navigate" }), _jsx("span", { children: "\u21B5 Select" }), _jsx("span", { children: "Esc Close" })] }), _jsxs("span", { children: [displayItems.length, " ", displayItems.length === 1 ? 'result' : 'results'] })] })] })] }));
}
