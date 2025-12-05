import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * UnifiedSidePanel - Combined History, Bookmarks, and Downloads panel
 * Based on Figma UI/UX Prototype Flow redesign
 */
import { useState, useEffect } from 'react';
import { Clock, Star, Download, X, Search, FolderOpen, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Use existing BookmarksPanel from bookmarks folder (has folders support)
import { BookmarksPanel } from '../bookmarks/BookmarksPanel';
import { WorkspacesPanel } from '../WorkspacesPanel';
import HistoryPage from '../../routes/History';
import DownloadsPage from '../../routes/Downloads';
const tabs = [
    { id: 'history', label: 'History', icon: _jsx(Clock, { size: 16 }) },
    { id: 'bookmarks', label: 'Bookmarks', icon: _jsx(Star, { size: 16 }) },
    { id: 'workspaces', label: 'Workspaces', icon: _jsx(FolderOpen, { size: 16 }) },
    { id: 'downloads', label: 'Downloads', icon: _jsx(Download, { size: 16 }) },
];
export function UnifiedSidePanel({ open, onClose, defaultTab = 'history', width = 420, }) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) {
                setCollapsed(false); // Full width on mobile
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    if (!open)
        return null;
    const panelWidth = collapsed ? 64 : isMobile ? '100%' : width;
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-40", "aria-hidden": "true" }), _jsxs(motion.div, { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: {
                        type: 'spring',
                        damping: 25,
                        stiffness: 200,
                    }, className: `fixed right-0 top-0 bottom-0 z-50 bg-[#1A1D28] border-l border-gray-800/60 flex flex-col shadow-2xl transition-all duration-300 ${isMobile ? 'w-full' : ''}`, style: { width: typeof panelWidth === 'string' ? panelWidth : `${panelWidth}px` }, role: "dialog", "aria-modal": "true", "aria-label": "Side panel", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-800/60 px-4 py-3", children: [!collapsed && (_jsx("div", { className: "flex items-center gap-2", children: _jsx("h2", { className: "text-lg font-semibold text-gray-100", children: "Library" }) })), _jsxs("div", { className: "flex items-center gap-2 ml-auto", children: [!isMobile && (_jsx("button", { onClick: () => setCollapsed(!collapsed), className: "p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors", title: collapsed ? 'Expand' : 'Collapse', children: _jsx(ChevronRight, { size: 18, className: `transition-transform ${collapsed ? 'rotate-180' : ''}` }) })), _jsx("button", { onClick: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                onClose();
                                            }, onMouseDown: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, className: "p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40", style: { zIndex: 10011, isolation: 'isolate' }, "aria-label": "Close panel", children: _jsx(X, { size: 18 }) })] })] }), !collapsed && (_jsx("div", { className: "flex items-center border-b border-gray-800/60 px-4 bg-gray-900/30", children: tabs
                                .filter(tab => tab && tab.id)
                                .map(tab => (_jsxs("button", { onClick: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                    if (tab)
                                        setActiveTab(tab.id);
                                }, onMouseDown: e => {
                                    e.stopImmediatePropagation();
                                    e.stopPropagation();
                                }, className: `
                    relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                    ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}
                  `, style: { zIndex: 10011, isolation: 'isolate' }, "aria-selected": activeTab === tab.id, role: "tab", children: [tab.icon, _jsx("span", { children: tab.label }), activeTab === tab.id && (_jsx(motion.div, { layoutId: "activeTab", className: "absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400", initial: false }))] }, tab.id))) })), !collapsed &&
                            (activeTab === 'history' ||
                                activeTab === 'bookmarks' ||
                                activeTab === 'workspaces') && (_jsx("div", { className: "px-4 py-3 border-b border-gray-800/60", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), placeholder: `Search ${activeTab}...`, className: "w-full pl-9 pr-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40" })] }) })), !collapsed && (_jsx("div", { className: "flex-1 overflow-hidden", children: _jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.2 }, className: "h-full overflow-y-auto", children: [activeTab === 'history' && (_jsx("div", { className: "h-full", children: _jsx(HistoryPage, {}) })), activeTab === 'bookmarks' && (_jsx("div", { className: "h-full", children: _jsx(BookmarksPanel, {}) })), activeTab === 'workspaces' && (_jsx("div", { className: "h-full", children: _jsx(WorkspacesPanel, {}) })), activeTab === 'downloads' && (_jsx("div", { className: "h-full", children: _jsx(DownloadsPage, {}) }))] }, activeTab) }) }))] })] })) }));
}
