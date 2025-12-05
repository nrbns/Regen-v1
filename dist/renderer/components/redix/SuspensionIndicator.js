import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { PauseCircle, RotateCcw, Moon } from 'lucide-react';
import { useTabSuspensionStore } from '../../state/tabSuspensionStore';
import { acknowledgeSuspendedTab, resumeSuspendedTab } from '../../core/redix/tab-suspension';
export function SuspensionIndicator() {
    const suspensions = useTabSuspensionStore(state => state.suspensions);
    const unacknowledged = useMemo(() => Object.values(suspensions).filter(entry => !entry.acknowledged), [suspensions]);
    if (!unacknowledged.length) {
        return null;
    }
    const list = [...unacknowledged]
        .sort((a, b) => (b.suspendedAt || 0) - (a.suspendedAt || 0))
        .slice(0, 3);
    return (_jsxs("div", { className: "fixed bottom-6 left-6 z-[120] flex flex-col gap-3", children: [list.map(entry => (_jsxs("article", { className: "flex w-[320px] items-center gap-3 rounded-2xl border border-purple-500/30 bg-slate-950/90 px-3 py-3 shadow-xl shadow-black/40 backdrop-blur", children: [_jsxs("div", { className: "relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/80", children: [entry.snapshot ? (_jsx("img", { src: entry.snapshot, alt: entry.title || entry.url || 'Sleeping tab', className: "h-16 w-16 object-cover" })) : (_jsx("div", { className: "flex h-16 w-16 items-center justify-center text-purple-300", children: _jsx(Moon, { size: 20 }) })), _jsx("span", { className: "absolute inset-0 bg-gradient-to-tr from-purple-600/30 to-transparent" })] }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-purple-300", children: [_jsx(PauseCircle, { size: 12 }), _jsx("span", { children: "Suspended" })] }), _jsx("p", { className: "text-sm font-semibold text-white line-clamp-1", children: entry.title || entry.url || 'Sleeping tab' }), _jsxs("p", { className: "text-xs text-slate-400", children: [entry.reason === 'memory'
                                        ? 'Paused for memory health'
                                        : 'Suspended to save resources', ' ', "\u2022 ", formatDistanceToNow(entry.suspendedAt ?? Date.now(), { addSuffix: true })] }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => resumeSuspendedTab(entry.tabId, { activate: true }), className: "inline-flex items-center gap-1 rounded-full bg-purple-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-purple-500/40 transition hover:brightness-110", children: [_jsx(RotateCcw, { size: 12 }), "Resume"] }), _jsx("button", { type: "button", onClick: () => acknowledgeSuspendedTab(entry.tabId), className: "rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300 transition hover:border-white/40 hover:text-white", children: "Keep sleeping" })] })] })] }, entry.tabId))), unacknowledged.length > list.length && (_jsxs("div", { className: "rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-xs text-slate-300 shadow-sm", children: ["+", unacknowledged.length - list.length, " more tabs sleeping"] }))] }));
}
