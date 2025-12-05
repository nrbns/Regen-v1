import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Multi-Tab Sync Indicator Component
 * Shows sync status across multiple tabs and handles conflicts
 */
import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSessionSync } from '../../hooks/useSessionSync';
export function MultiTabSyncIndicator({ className = '' }) {
    const { sessionId, isSynced, lastSyncTime, retrySync } = useSessionSync();
    const [tabs, setTabs] = useState([]);
    const [conflictCount, setConflictCount] = useState(0);
    // Listen for sync events from other tabs
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'regenbrowser_sync_status') {
                try {
                    const status = JSON.parse(e.newValue || '{}');
                    setTabs(prev => {
                        const existing = prev.find(t => t.tabId === status.tabId);
                        if (existing) {
                            return prev.map(t => t.tabId === status.tabId
                                ? {
                                    ...t,
                                    isSynced: status.isSynced,
                                    lastSyncTime: status.lastSyncTime ? new Date(status.lastSyncTime) : null,
                                }
                                : t);
                        }
                        return [...prev, status];
                    });
                }
                catch {
                    // Ignore parse errors
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        // Broadcast our status
        const broadcastStatus = () => {
            const status = {
                tabId: `tab-${Date.now()}`,
                sessionId,
                isSynced,
                lastSyncTime,
            };
            localStorage.setItem('regenbrowser_sync_status', JSON.stringify(status));
        };
        broadcastStatus();
        const interval = setInterval(broadcastStatus, 5000);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [sessionId, isSynced, lastSyncTime]);
    // Detect conflicts (different session IDs)
    useEffect(() => {
        const conflicts = tabs.filter(t => t.sessionId !== sessionId);
        setConflictCount(conflicts.length);
    }, [tabs, sessionId]);
    const allSynced = tabs.length > 0 && tabs.every(t => t.isSynced);
    const hasConflicts = conflictCount > 0;
    return (_jsxs("div", { className: `multi-tab-sync-indicator rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 ${className}`, role: "status", "aria-live": "polite", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Layers, { size: 16, className: "text-slate-400" }), _jsx("span", { className: "text-sm font-medium text-slate-200", children: "Multi-Tab Sync" })] }), hasConflicts && (_jsxs("span", { className: "rounded border border-yellow-500/40 bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-100", children: [conflictCount, " conflict", conflictCount > 1 ? 's' : ''] }))] }), _jsxs("div", { className: "space-y-2", children: [allSynced ? (_jsxs("div", { className: "flex items-center gap-2 text-xs text-green-400", children: [_jsx(CheckCircle2, { size: 12 }), _jsx("span", { children: "All tabs synced" })] })) : (_jsxs("div", { className: "flex items-center gap-2 text-xs text-yellow-400", children: [_jsx(AlertCircle, { size: 12 }), _jsx("span", { children: "Some tabs not synced" })] })), tabs.length > 0 && (_jsx("div", { className: "space-y-1", children: tabs.map(tab => (_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [tab.isSynced ? (_jsx(CheckCircle2, { size: 10, className: "text-green-400" })) : (_jsx(AlertCircle, { size: 10, className: "text-red-400" })), _jsx("span", { className: "text-slate-400", children: tab.tabId === `tab-${Date.now()}` ? 'This tab' : tab.tabId.slice(0, 8) }), tab.sessionId !== sessionId && (_jsx("span", { className: "text-[10px] text-yellow-400", children: "(different session)" }))] }), tab.lastSyncTime && (_jsx("span", { className: "text-[10px] text-slate-500", children: formatDistanceToNow(tab.lastSyncTime, { addSuffix: true }) }))] }, tab.tabId))) })), !allSynced && (_jsxs("button", { onClick: retrySync, className: "flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/20 px-2 py-1 text-xs text-blue-100 transition-colors hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50", "aria-label": "Retry sync for all tabs", children: [_jsx(RefreshCw, { size: 12 }), _jsx("span", { children: "Sync All Tabs" })] }))] })] }));
}
