import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Info, Sparkles, Shield } from 'lucide-react';
import { calculateCredibility, getCredibilityColor, getCredibilityLabel } from '../../core/research/sourceCredibility';
const SOURCE_LABEL = {
    news: 'News',
    academic: 'Academic',
    documentation: 'Docs',
    forum: 'Forum',
    other: 'Web',
};
const BADGE_STYLE = {
    news: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
    academic: 'bg-purple-500/10 text-purple-200 border-purple-500/30',
    documentation: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
    forum: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
    other: 'bg-slate-500/10 text-slate-200 border-slate-500/30',
};
export function SourceCard({ source, index, isActive, onActivate, onOpen }) {
    const [expanded, setExpanded] = useState(false);
    const sourceKey = source.url ?? `source-${index}`;
    const provider = typeof source.metadata?.provider === 'string' ? source.metadata.provider : undefined;
    const relevance = Number.isFinite(source.relevanceScore) ? source.relevanceScore : null;
    const type = source.sourceType || source.type || 'other';
    const canOpen = Boolean(source.url);
    const fetchedAtLabel = source.fetchedAt ? new Date(source.fetchedAt).toLocaleString() : null;
    const languageLabel = source.lang ? source.lang.toUpperCase() : null;
    const selectorMatched = Boolean(source.metadata?.selectorMatched);
    // Phase 1, Day 6: Calculate credibility
    const credibility = useMemo(() => calculateCredibility(source), [source]);
    const credibilityColor = getCredibilityColor(credibility.level);
    const credibilityLabel = getCredibilityLabel(credibility.level);
    const preview = useMemo(() => {
        if (expanded) {
            return source.text || source.snippet || source.excerpt || '';
        }
        return (source.excerpt ||
            source.snippet ||
            (source.text ? `${source.text.slice(0, 220)}${source.text.length > 220 ? '…' : ''}` : ''));
    }, [expanded, source.excerpt, source.snippet, source.text]);
    const handleActivate = () => {
        onActivate(sourceKey);
    };
    return (_jsxs("article", { className: `rounded-2xl border p-4 transition-colors ${isActive
            ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`, children: [_jsxs("header", { className: "flex flex-wrap items-start gap-3", children: [_jsxs("button", { type: "button", onClick: handleActivate, className: "flex-1 text-left", children: [_jsxs("p", { className: "text-xs uppercase tracking-wide text-gray-500", children: ["Source ", index + 1] }), _jsx("h4", { className: "mt-0.5 text-base font-semibold text-white hover:text-blue-200 transition-colors", children: source.title || source.url || 'Untitled source' }), _jsx("p", { className: "text-xs text-gray-500", children: source.domain || provider || 'unknown-domain' })] }), _jsxs("div", { className: "flex flex-col items-end gap-2 text-xs", children: [_jsx("span", { className: `rounded-full border px-2 py-0.5 capitalize ${BADGE_STYLE[type] ?? BADGE_STYLE.other}`, children: SOURCE_LABEL[type] ?? SOURCE_LABEL.other }), provider && (_jsx("span", { className: "rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400", children: provider })), relevance !== null && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-gray-300", children: [_jsx(Sparkles, { size: 12, className: "text-blue-200" }), Math.round(relevance)] })), _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${credibilityColor}`, children: [_jsx(Shield, { size: 10 }), credibilityLabel, " (", credibility.score, "/100)"] })] })] }), source.image && (_jsx("div", { className: "mt-3 h-36 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]", children: _jsx("img", { src: source.image, alt: source.title || 'Preview', className: "h-full w-full object-cover", loading: "lazy" }) })), _jsx("p", { className: "mt-3 text-sm text-gray-300 leading-relaxed whitespace-pre-line", children: preview }), _jsxs("footer", { className: "mt-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-400", children: [source.wordCount && source.wordCount > 0 && (_jsxs("span", { className: "rounded-full border border-white/10 px-2 py-0.5", children: [source.wordCount.toLocaleString(), " words"] })), languageLabel && (_jsxs("span", { className: "rounded-full border border-white/10 px-2 py-0.5", children: ["Lang ", languageLabel] })), source.rendered && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-indigo-200", children: [_jsx(Info, { size: 11 }), "Rendered"] })), source.fromCache && (_jsx("span", { className: "rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200", children: "Cached" })), selectorMatched && (_jsx("span", { className: "rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-blue-200", children: "Focused extract" })), fetchedAtLabel && (_jsx("span", { className: "rounded-full border border-white/10 px-2 py-0.5", children: fetchedAtLabel }))] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2 text-sm", children: [_jsxs("button", { type: "button", onClick: () => canOpen && onOpen(source.url), disabled: !canOpen, className: `inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${canOpen
                            ? 'border-white/20 text-white hover:border-blue-400/50 hover:text-blue-100'
                            : 'border-white/5 text-gray-500 cursor-not-allowed'}`, children: [canOpen ? 'Open source' : 'No link', _jsx(ExternalLink, { size: 14 })] }), _jsx("button", { type: "button", onClick: () => setExpanded(prev => !prev), className: "inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white", children: expanded ? (_jsxs(_Fragment, { children: ["Collapse", _jsx(ChevronUp, { size: 14 })] })) : (_jsxs(_Fragment, { children: ["Expand details", _jsx(ChevronDown, { size: 14 })] })) })] })] }));
}
