import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Global Command Bar - Tier 3
 * Spotlight-style command palette (⌘K / Ctrl+K)
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, FileText, Settings, BookOpen, FolderOpen, ArrowRight, Activity, } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { useTabsStore } from '../../state/tabsStore';
import { useBookmarksStore } from '../../state/bookmarksStore';
import { ipc } from '../../lib/ipc-typed';
import { track } from '../../services/analytics';
import { useSystemStatus } from '../../hooks/useSystemStatus';
export function CommandBar() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const setMode = useAppStore(state => state.setMode);
    const bookmarks = useBookmarksStore(state => state.bookmarks);
    const { data: systemStatus } = useSystemStatus();
    // Build command list
    const commands = useMemo(() => {
        const items = [
            // Modes
            {
                id: 'mode-research',
                label: 'Switch to Research Mode',
                description: 'AI-powered research and analysis',
                icon: Search,
                keywords: ['research', 'mode', 'switch'],
                category: 'modes',
                action: () => setMode('Research'),
            },
            // Actions
            {
                id: 'new-tab',
                label: 'New Tab',
                description: 'Open a new tab',
                icon: FileText,
                keywords: ['new', 'tab', 'open'],
                category: 'actions',
                action: async () => {
                    const newTab = await ipc.tabs.create('about:blank');
                    if (newTab) {
                        const tabId = typeof newTab === 'object' && 'id' in newTab
                            ? newTab.id
                            : typeof newTab === 'string'
                                ? newTab
                                : null;
                        if (tabId && typeof tabId === 'string') {
                            useTabsStore.getState().setActive(tabId);
                        }
                    }
                },
            },
            {
                id: 'open-omniagent',
                label: 'Open OmniAgent',
                description: 'Ask OmniAgent a question',
                icon: Sparkles,
                keywords: ['agent', 'omniagent', 'ai', 'ask'],
                category: 'actions',
                action: async () => {
                    await setMode('Research');
                    // Focus on OmniAgent input
                    const event = new CustomEvent('omniagent:focus');
                    window.dispatchEvent(event);
                },
            },
            // Navigation
            {
                id: 'open-settings',
                label: 'Open Settings',
                description: 'Configure Regen',
                icon: Settings,
                keywords: ['settings', 'preferences', 'config'],
                category: 'navigation',
                action: async () => {
                    // Open settings in a new tab
                    try {
                        await ipc.tabs.create({
                            url: '/settings',
                            activate: true, // Activate the new tab
                        });
                    }
                    catch (error) {
                        console.error('[CommandBar] Failed to open settings in new tab:', error);
                        // Fallback to navigation if tab creation fails
                        window.location.href = '/settings';
                    }
                },
            },
            {
                id: 'open-bookmarks',
                label: 'Open Bookmarks',
                description: 'View saved bookmarks',
                icon: BookOpen,
                keywords: ['bookmarks', 'saved', 'favorites'],
                category: 'navigation',
                action: () => {
                    const event = new CustomEvent('sidepanel:open', { detail: { tab: 'bookmarks' } });
                    window.dispatchEvent(event);
                },
            },
            {
                id: 'open-workspaces',
                label: 'Open Workspaces',
                description: 'View saved workspaces',
                icon: FolderOpen,
                keywords: ['workspaces', 'sessions', 'saved'],
                category: 'navigation',
                action: () => {
                    const event = new CustomEvent('sidepanel:open', { detail: { tab: 'workspaces' } });
                    window.dispatchEvent(event);
                },
            },
            {
                id: 'system-status',
                label: 'System Status',
                description: 'View system health and service status',
                icon: Activity,
                keywords: ['system', 'status', 'health', 'redis', 'redix', 'worker'],
                category: 'settings',
                action: () => {
                    // Trigger system status panel to open
                    const event = new CustomEvent('system-status:open');
                    window.dispatchEvent(event);
                },
            },
        ];
        // Add bookmarks as commands
        bookmarks.slice(0, 5).forEach(bookmark => {
            items.push({
                id: `bookmark-${bookmark.id}`,
                label: bookmark.title,
                description: bookmark.url,
                icon: BookOpen,
                keywords: [bookmark.title, bookmark.url, 'bookmark'],
                category: 'navigation',
                action: async () => {
                    const newTab = await ipc.tabs.create(bookmark.url);
                    if (newTab) {
                        const tabId = typeof newTab === 'object' && 'id' in newTab
                            ? newTab.id
                            : typeof newTab === 'string'
                                ? newTab
                                : null;
                        if (tabId && typeof tabId === 'string') {
                            useTabsStore.getState().setActive(tabId);
                        }
                    }
                },
            });
        });
        return items;
    }, [bookmarks, setMode, systemStatus]);
    // Filter commands based on query
    const filteredCommands = useMemo(() => {
        if (!query.trim())
            return commands;
        const lowerQuery = query.toLowerCase();
        return commands.filter(cmd => cmd.label.toLowerCase().includes(lowerQuery) ||
            cmd.description?.toLowerCase().includes(lowerQuery) ||
            cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)));
    }, [commands, query]);
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ⌘K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
                track('command_bar_opened');
            }
            if (open) {
                if (e.key === 'Escape') {
                    setOpen(false);
                }
                else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
                }
                else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                }
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    const command = filteredCommands[selectedIndex];
                    if (command) {
                        command.action();
                        setOpen(false);
                        setQuery('');
                        track('command_bar_executed', { command: command.id });
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, filteredCommands, selectedIndex]);
    // Reset selected index when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);
    const handleCommandClick = (command) => {
        command.action();
        setOpen(false);
        setQuery('');
        track('command_bar_executed', { command: command.id });
    };
    // Group commands by category
    const groupedCommands = useMemo(() => {
        const groups = {};
        filteredCommands.forEach(cmd => {
            if (!groups[cmd.category])
                groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        });
        return groups;
    }, [filteredCommands]);
    const categoryLabels = {
        modes: 'Modes',
        actions: 'Actions',
        navigation: 'Navigation',
        settings: 'Settings',
    };
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: () => setOpen(false), className: "fixed inset-0 z-[1080] bg-black/60 backdrop-blur-sm" }), _jsxs(motion.div, { initial: { opacity: 0, scale: 0.95, y: -20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: -20 }, className: "fixed left-1/2 top-1/2 z-[1080] mx-4 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl", children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-slate-800 p-4", children: [_jsx(Search, { size: 20, className: "text-slate-400" }), _jsx("input", { id: "command-bar-search", name: "command-bar-query", type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: "Type a command or search...", className: "flex-1 bg-transparent text-lg text-white placeholder-slate-500 focus:outline-none", autoFocus: true }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500", children: [_jsx("kbd", { className: "rounded border border-slate-700 bg-slate-800 px-2 py-1", children: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl' }), _jsx("span", { children: "+" }), _jsx("kbd", { className: "rounded border border-slate-700 bg-slate-800 px-2 py-1", children: "K" })] })] }), _jsx("div", { className: "max-h-96 overflow-y-auto p-2", children: filteredCommands.length === 0 ? (_jsxs("div", { className: "p-8 text-center text-slate-400", children: [_jsx("p", { children: "No commands found" }), _jsx("p", { className: "mt-2 text-sm", children: "Try a different search term" })] })) : (Object.entries(groupedCommands).map(([category, items]) => (_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500", children: categoryLabels[category] || category }), items.map((cmd, _idx) => {
                                        const globalIndex = filteredCommands.indexOf(cmd);
                                        const isSelected = globalIndex === selectedIndex;
                                        return (_jsxs("button", { onClick: () => handleCommandClick(cmd), onMouseEnter: () => setSelectedIndex(globalIndex), className: `flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isSelected
                                                ? 'border border-purple-500/40 bg-gradient-to-r from-purple-500/20 to-cyan-500/20'
                                                : 'hover:bg-slate-800'}`, children: [_jsx(cmd.icon, { size: 18, className: isSelected ? 'text-purple-300' : 'text-slate-400' }), _jsxs("div", { className: "flex-1 text-left", children: [_jsx("div", { className: `font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`, children: cmd.label }), cmd.description && (_jsx("div", { className: "mt-0.5 text-xs text-slate-500", children: cmd.description }))] }), isSelected && _jsx(ArrowRight, { size: 16, className: "text-purple-300" })] }, cmd.id));
                                    })] }, category)))) })] })] })) }));
}
