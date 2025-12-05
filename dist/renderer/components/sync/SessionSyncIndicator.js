import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Session Sync Indicator Component
 * Shows per-session cursor state, sync status, and last sync timestamp
 * Fixes multi-tab cursor UI bug
 */
import { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { useSessionSync } from '../../hooks/useSessionSync';
import { formatDistanceToNow } from 'date-fns';
export function SessionSyncIndicator({ className = '', showSessionId = true, compact = false, }) {
    const { sessionId, isSynced, lastSyncTime, syncError, retrySync } = useSessionSync();
    const [isRetrying, setIsRetrying] = useState(false);
    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            await retrySync();
        }
        finally {
            setIsRetrying(false);
        }
    };
    const formatRelativeTime = (date) => {
        if (!date)
            return 'never';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        if (seconds < 10)
            return 'just now';
        if (seconds < 60)
            return `${seconds}s ago`;
        if (minutes < 60)
            return `${minutes}m ago`;
        return formatDistanceToNow(date, { addSuffix: true });
    };
    if (compact) {
        return (_jsxs("div", { className: `session-sync-indicator-compact flex items-center gap-2 ${className}`, role: "status", "aria-live": "polite", children: [isSynced ? (_jsx(CheckCircle2, { size: 14, className: "text-green-400", "aria-label": "Synced" })) : (_jsx(AlertCircle, { size: 14, className: "text-red-400", "aria-label": "Sync failed" })), lastSyncTime && (_jsx("span", { className: "text-xs text-slate-400", children: formatRelativeTime(lastSyncTime) }))] }));
    }
    return (_jsxs("div", { className: `session-sync-indicator rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 ${className}`, role: "status", "aria-live": "polite", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("div", { className: "flex items-center gap-2", children: isSynced ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { size: 16, className: "text-green-400", "aria-label": "Synced" }), _jsx("span", { className: "text-sm font-medium text-green-100", children: "Synced" })] })) : (_jsxs(_Fragment, { children: [_jsx(AlertCircle, { size: 16, className: "text-red-400", "aria-label": "Sync failed" }), _jsx("span", { className: "text-sm font-medium text-red-100", children: "Sync failed" })] })) }), !isSynced && (_jsxs("button", { onClick: handleRetry, disabled: isRetrying, className: "flex items-center gap-1 rounded border border-red-500/40 bg-red-500/20 px-2 py-1 text-xs text-red-100 transition-colors hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50", "aria-label": "Retry sync", children: [_jsx(RefreshCw, { size: 12, className: isRetrying ? 'animate-spin' : '' }), _jsx("span", { children: "Retry" })] }))] }), lastSyncTime && (_jsxs("div", { className: "mb-2 flex items-center gap-2 text-xs text-slate-400", children: [_jsx(Clock, { size: 12 }), _jsxs("span", { children: ["Last sync: ", formatRelativeTime(lastSyncTime)] }), _jsxs("span", { className: "text-slate-500", children: ["(", lastSyncTime.toLocaleTimeString(), ")"] })] })), showSessionId && (_jsxs("div", { className: "font-mono text-xs text-slate-500", children: ["Session: ", sessionId.slice(0, 8), "..."] })), syncError && !isSynced && (_jsxs("div", { className: "mt-2 flex items-center gap-1 text-xs text-red-400", children: [_jsx(AlertCircle, { size: 12 }), _jsx("span", { children: syncError })] }))] }));
}
