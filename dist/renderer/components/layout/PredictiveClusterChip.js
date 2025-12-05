import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Navigation } from 'lucide-react';
export function PredictiveClusterChip({ clusters, summary, onApply }) {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (!clusters.length) {
            setIndex(0);
        }
        else if (index >= clusters.length) {
            setIndex(0);
        }
    }, [clusters, index]);
    if (!clusters.length)
        return null;
    const current = clusters[index];
    const confidence = typeof current.confidence === 'number' ? Math.round(current.confidence * 100) : null;
    return (_jsxs(motion.div, { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 }, className: "no-drag flex items-center gap-2 mr-3", children: [_jsxs("button", { type: "button", onClick: () => onApply(current.id), className: "flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-3 py-1.5 text-xs text-blue-100 transition-colors hover:bg-blue-500/25", title: summary ?? 'Redix suggests regrouping these tabs into a focused workspace.', children: [_jsx(PlayCircle, { size: 12 }), _jsxs("span", { className: "font-semibold", children: ["Regroup ", current.label] }), confidence !== null && _jsxs("span", { className: "text-[11px] text-blue-200/80", children: [confidence, "%"] })] }), clusters.length > 1 && (_jsx("button", { type: "button", onClick: () => setIndex((prev) => (prev + 1) % clusters.length), className: "rounded-full border border-slate-700/60 p-1.5 text-[10px] text-slate-300 transition-colors hover:text-slate-100", "aria-label": "Next suggested cluster", children: "\u25CF" }))] }));
}
export function PredictivePrefetchHint({ entry, onOpen }) {
    if (!entry)
        return null;
    let hostLabel = entry.url;
    try {
        hostLabel = new URL(entry.url).hostname.replace(/^www\./, '');
    }
    catch {
        // keep original url
    }
    const confidence = typeof entry.confidence === 'number' ? Math.round(entry.confidence * 100) : null;
    return (_jsx(motion.div, { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 }, className: "no-drag flex items-center gap-2 mr-3", children: _jsxs("button", { type: "button", onClick: () => onOpen(entry), className: "flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-500/25", title: entry.reason, children: [_jsx(Navigation, { size: 12 }), _jsxs("span", { className: "font-semibold", children: ["Scout ", hostLabel] }), confidence !== null && _jsxs("span", { className: "text-[11px] text-emerald-200/80", children: [confidence, "%"] })] }) }));
}
