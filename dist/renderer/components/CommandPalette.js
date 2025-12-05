import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Command Palette (Cmd+K / Ctrl+K)
 * SigmaOS/Arc-style command bar for quick actions
 */
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, TrendingUp, Globe, FileText, X } from 'lucide-react';
import { useAppStore } from '../state/appStore';
import { toast } from '../utils/toast';
export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const { setMode } = useAppStore();
    const commands = [
        {
            id: 'research',
            label: 'Research Mode',
            description: 'Open research mode and search',
            icon: Sparkles,
            keywords: ['research', 'search', 'find', 'lookup'],
            action: async () => {
                await setMode('Research');
                setIsOpen(false);
                toast.info('Research mode opened');
            },
        },
        {
            id: 'trade',
            label: 'Trade Mode',
            description: 'Open trading mode with charts',
            icon: TrendingUp,
            keywords: ['trade', 'trading', 'chart', 'btc', 'crypto'],
            action: async () => {
                await setMode('Trade');
                setIsOpen(false);
                toast.info('Trade mode opened');
            },
        },
        {
            id: 'browse',
            label: 'Browse Mode',
            description: 'Switch to browsing mode',
            icon: Globe,
            keywords: ['browse', 'web', 'internet'],
            action: async () => {
                await setMode('Browse');
                setIsOpen(false);
                toast.info('Browse mode opened');
            },
        },
        {
            id: 'wispr',
            label: 'WISPR Voice',
            description: 'Activate WISPR voice assistant',
            icon: Sparkles,
            keywords: ['wispr', 'voice', 'jarvis', 'assistant'],
            action: () => {
                setIsOpen(false);
                // Trigger WISPR activation
                window.dispatchEvent(new CustomEvent('activate-wispr'));
                toast.info('WISPR activated');
            },
        },
        {
            id: 'new-workspace',
            label: 'New Workspace',
            description: 'Create a new workspace for organizing tabs',
            icon: FileText,
            keywords: ['workspace', 'new', 'create', 'folder'],
            action: async () => {
                setIsOpen(false);
                // Trigger workspace creation
                window.dispatchEvent(new CustomEvent('create-workspace'));
                toast.info('New workspace created');
            },
        },
        {
            id: 'look-it-up',
            label: 'Look It Up',
            description: 'Quick search and summarize (SigmaOS-style)',
            icon: Search,
            keywords: ['look', 'search', 'summarize', 'quick'],
            action: async () => {
                setIsOpen(false);
                // Open quick search
                window.dispatchEvent(new CustomEvent('open-quick-search'));
                toast.info('Quick search opened');
            },
        },
    ];
    // Filter commands based on query
    const filteredCommands = React.useMemo(() => {
        if (!query.trim())
            return commands;
        const lowerQuery = query.toLowerCase();
        return commands.filter(cmd => cmd.label.toLowerCase().includes(lowerQuery) ||
            cmd.description.toLowerCase().includes(lowerQuery) ||
            cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)));
    }, [query]);
    // Keyboard navigation
    useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                }
            }
            else if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex]);
    // Global shortcut: Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            if (modifier && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                if (!isOpen) {
                    setTimeout(() => inputRef.current?.focus(), 100);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);
    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);
    return (_jsx(AnimatePresence, { children: isOpen && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: () => setIsOpen(false), className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50" }), _jsx(motion.div, { initial: { opacity: 0, scale: 0.95, y: -20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: -20 }, className: "fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50", children: _jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-slate-800", children: [_jsx(Search, { className: "w-5 h-5 text-slate-400" }), _jsx("input", { ref: inputRef, type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: "Type a command or search...", className: "flex-1 bg-transparent text-white placeholder-slate-500 outline-none", autoFocus: true }), _jsx("button", { onClick: () => setIsOpen(false), className: "text-slate-400 hover:text-white transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "max-h-96 overflow-y-auto", children: filteredCommands.length === 0 ? (_jsx("div", { className: "px-4 py-8 text-center text-slate-400", children: "No commands found" })) : (filteredCommands.map((cmd, index) => {
                                    const Icon = cmd.icon;
                                    const isSelected = index === selectedIndex;
                                    return (_jsxs("button", { onClick: () => cmd.action(), onMouseEnter: () => setSelectedIndex(index), className: `w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected
                                            ? 'bg-purple-600/20 border-l-2 border-purple-500'
                                            : 'hover:bg-slate-800/50'}`, children: [_jsx(Icon, { size: 20, className: "text-slate-400" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-white font-medium", children: cmd.label }), _jsx("div", { className: "text-sm text-slate-400", children: cmd.description })] }), isSelected && _jsx("div", { className: "text-xs text-slate-500", children: "Enter" })] }, cmd.id));
                                })) }), _jsxs("div", { className: "px-4 py-2 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between", children: [_jsx("div", { children: "\u2191\u2193 Navigate \u2022 Enter Select \u2022 Esc Close" }), _jsx("div", { children: "Cmd+K / Ctrl+K to open" })] })] }) })] })) }));
}
