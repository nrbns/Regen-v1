import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3 } from 'lucide-react';
import { useMemoryStore } from '../../state/memoryStore';
const severityColor = (ratio) => {
    if (ratio >= 0.85)
        return 'text-red-400';
    if (ratio >= 0.7)
        return 'text-amber-300';
    return 'text-emerald-300';
};
export function MemoryMonitor() {
    const latest = useMemoryStore(state => state.latest);
    const history = useMemoryStore(state => state.history);
    const capacityMB = useMemoryStore(state => state.capacityMB);
    const [expanded, setExpanded] = useState(true);
    const topTabs = useMemo(() => {
        if (!latest)
            return [];
        return [...latest.tabs].sort((a, b) => b.memoryMB - a.memoryMB).slice(0, 5);
    }, [latest]);
    const sparklinePoints = useMemo(() => {
        if (!history.length)
            return [];
        const max = Math.max(...history.map(snapshot => snapshot.totalMB || 0), 1);
        return history.slice(-40).map((snapshot, index, arr) => ({
            x: (index / Math.max(1, arr.length - 1)) * 100,
            y: 40 - (Math.min(snapshot.totalMB || 0, max) / max) * 40,
        }));
    }, [history]);
    if (!latest)
        return null;
    const total = latest.totalMB;
    const capacity = capacityMB ?? Math.max(total * 1.5, 4096);
    const ratio = Math.min(total / capacity, 1);
    const percent = Math.round(ratio * 100);
    const severity = severityColor(ratio);
    return (_jsxs("div", { className: "rounded-3xl border border-slate-900/60 bg-slate-950/70 p-4 shadow-inner shadow-black/40", children: [_jsxs("header", { className: "mb-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-white", children: [_jsx(Activity, { size: 16, className: "text-purple-300" }), _jsx("h3", { className: "text-sm font-semibold uppercase tracking-[0.3em]", children: "Memory Monitor" })] }), _jsx("button", { type: "button", onClick: () => setExpanded(prev => !prev), className: "text-xs text-slate-400 underline-offset-2 hover:text-white", children: expanded ? 'Hide' : 'Show' })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("div", { className: "text-xs text-slate-400", children: "Total usage" }), _jsxs("div", { className: "text-xl font-semibold text-white", children: [total.toFixed(0), " MB", ' ', _jsxs("span", { className: "text-sm text-slate-500", children: ["/ ", capacity.toFixed(0), " MB", latest.freeMB ? ` (≈${latest.freeMB.toFixed(0)} MB free)` : ''] })] }), _jsx("div", { className: "mt-2 h-3 overflow-hidden rounded-full bg-slate-800", children: _jsx("div", { className: `h-full rounded-full ${ratio >= 0.85 ? 'bg-red-500' : ratio >= 0.7 ? 'bg-amber-400' : 'bg-emerald-400'}`, style: { width: `${percent}%` } }) }), _jsxs("p", { className: `mt-1 text-xs font-semibold ${severity}`, children: [percent, "% of budget used"] })] }), _jsxs("div", { className: "flex min-w-[160px] flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300", children: [_jsx("span", { className: "text-slate-400", children: "Trend (last 30 samples)" }), _jsx("svg", { width: "140", height: "40", viewBox: "0 0 100 40", preserveAspectRatio: "none", className: "text-purple-300", children: _jsx("polyline", { fill: "none", stroke: "currentColor", strokeWidth: "2", points: sparklinePoints.map(point => `${point.x},${point.y}`).join(' ') }) })] })] }), expanded && (_jsxs("div", { className: "mt-4 grid gap-3 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400", children: [_jsx(BarChart3, { size: 14 }), "Top tabs"] }), _jsx("div", { className: "space-y-2", children: topTabs.map(tab => (_jsxs("div", { className: "flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm text-slate-200", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate font-semibold text-white", children: tab.title || tab.url || 'Untitled tab' }), _jsx("p", { className: "text-xs text-slate-400", children: tab.appMode || 'Browse' })] }), _jsxs("span", { className: "ml-3 font-semibold text-slate-100", children: [tab.memoryMB.toFixed(0), " MB"] })] }, tab.tabId))) })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400", children: [_jsx(AlertTriangle, { size: 14 }), "Alerts"] }), percent >= 85 ? (_jsx("div", { className: "rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200", children: "Memory is critically high. Consider closing heavy tabs." })) : percent >= 70 ? (_jsx("div", { className: "rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200", children: "Memory usage elevated. Auto power-save may trigger soon." })) : (_jsx("div", { className: "rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200", children: "Memory is healthy. Redix is reclaiming surplus automatically." }))] })] }))] }));
}
