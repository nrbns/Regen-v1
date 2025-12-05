import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, Layers, Shield, Sparkles, Trash2 } from 'lucide-react';
export function CompareAnswersPanel({ open, answers, selectedIds, onToggleSelect, onClose, onRemove, }) {
    const selectedAnswers = selectedIds
        .map(id => answers.find(answer => answer.id === id))
        .filter(Boolean);
    const overlapStats = useMemo(() => {
        if (selectedAnswers.length < 2) {
            return { sharedDomains: [] };
        }
        const [first, second] = selectedAnswers;
        const firstDomains = new Set((first.sources ?? []).map(source => source.domain || source.url));
        const secondDomains = new Set((second.sources ?? []).map(source => source.domain || source.url));
        const sharedDomains = [...firstDomains].filter(domain => domain && secondDomains.has(domain));
        return { sharedDomains };
    }, [selectedAnswers]);
    const differenceSummary = useMemo(() => {
        if (selectedAnswers.length < 2) {
            return [];
        }
        const [first, second] = selectedAnswers;
        return extractUniqueSentences(first.summary, second.summary, first.id, second.id);
    }, [selectedAnswers]);
    return (_jsx(AnimatePresence, { children: open && (_jsxs(motion.aside, { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { type: 'spring', stiffness: 200, damping: 30 }, className: "fixed inset-x-0 bottom-0 z-[80] max-h-[70vh] overflow-hidden rounded-t-3xl border border-white/10 bg-[#070912]/95 shadow-2xl shadow-black/40 backdrop-blur", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-white/5 px-6 py-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-sky-300", children: "Compare answers" }), _jsxs("p", { className: "text-sm text-gray-400", children: [answers.length, " saved \u2022 select up to 2"] })] }), _jsxs("button", { type: "button", onClick: onClose, className: "inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-white/30", children: [_jsx(ChevronLeft, { size: 14 }), "Close"] })] }), _jsxs("div", { className: "grid gap-4 border-b border-white/5 px-6 py-4 md:grid-cols-2", children: [answers.length === 0 && (_jsx("div", { className: "col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-gray-400", children: "Save answers from Research Mode to compare them here." })), answers.map(answer => {
                            const isSelected = selectedIds.includes(answer.id);
                            return (_jsxs("button", { type: "button", onClick: () => onToggleSelect(answer.id), className: `rounded-2xl border px-4 py-3 text-left transition-all ${isSelected
                                    ? 'border-sky-500/60 bg-sky-500/10 shadow-[0_0_35px_rgba(56,189,248,0.2)]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`, children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-500", children: [_jsx("span", { children: new Date(answer.createdAt).toLocaleString() }), _jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300", children: [_jsx(Shield, { size: 12, className: "text-emerald-300" }), (answer.provider || answer.model || 'ai').toUpperCase()] })] }), _jsx("p", { className: "mt-2 line-clamp-3 text-sm text-gray-200", children: answer.summary }), _jsxs("div", { className: "mt-3 flex items-center gap-2 text-[11px] text-gray-400", children: [_jsxs("span", { children: [answer.sources.length, " sources"] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Authority bias ", answer.settings.authorityBias, "%"] }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: answer.settings.region })] }), _jsxs("div", { className: "mt-3 flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-sky-300", children: isSelected ? 'Selected' : 'Tap to select' }), _jsxs("button", { type: "button", onClick: event => {
                                                    event.stopPropagation();
                                                    onRemove(answer.id);
                                                }, className: "inline-flex items-center gap-1 rounded-full border border-red-500/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-200 hover:border-red-400", children: [_jsx(Trash2, { size: 12 }), "Remove"] })] })] }, answer.id));
                        })] }), _jsxs("div", { className: "grid gap-4 px-6 py-4 md:grid-cols-2", children: [selectedAnswers.length === 0 && (_jsx("div", { className: "col-span-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-gray-400", children: "Select two answers above to view a detailed comparison." })), selectedAnswers.slice(0, 2).map(answer => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.02] p-4", children: [_jsxs("header", { className: "flex items-center justify-between text-xs text-gray-400", children: [_jsxs("span", { className: "inline-flex items-center gap-1 text-white", children: [_jsx(Sparkles, { size: 12, className: "text-sky-300" }), answer.query] }), _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Calendar, { size: 12 }), new Date(answer.createdAt).toLocaleTimeString()] })] }), _jsx("p", { className: "mt-3 text-sm text-gray-200 whitespace-pre-line", children: answer.summary }), _jsxs("div", { className: "mt-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-3", children: [_jsx(StatBlock, { label: "Confidence", value: formatPercent(answer.confidence) }), _jsx(StatBlock, { label: "Sources", value: `${answer.sources.length}` }), _jsx(StatBlock, { label: "Settings", value: `${answer.settings.authorityBias}% authority` })] })] }, answer.id))), selectedAnswers.length >= 2 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.02] p-4", children: [_jsxs("h4", { className: "flex items-center gap-2 text-sm font-semibold text-white", children: [_jsx(Layers, { size: 14, className: "text-sky-300" }), "Shared sources (", overlapStats.sharedDomains.length, ")"] }), _jsx("ul", { className: "mt-3 space-y-1 text-xs text-gray-300", children: overlapStats.sharedDomains.length > 0 ? (overlapStats.sharedDomains.map(domain => (_jsx("li", { className: "rounded border border-white/10 px-2 py-1", children: domain }, domain)))) : (_jsx("li", { className: "text-gray-500", children: "No overlapping domains." })) })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.02] p-4", children: [_jsx("h4", { className: "text-sm font-semibold text-white", children: "Unique takeaways" }), _jsx("ul", { className: "mt-3 space-y-2 text-sm text-gray-300", children: differenceSummary.length > 0 ? (differenceSummary.map(diff => (_jsxs("li", { className: "rounded border border-white/10 px-3 py-2", children: [_jsx("span", { className: "text-[11px] uppercase tracking-wide text-sky-300", children: diff.owner === selectedAnswers[0].id ? 'Answer A' : 'Answer B' }), _jsx("p", { className: "text-gray-200", children: diff.text })] }, diff.text)))) : (_jsx("li", { className: "text-gray-500", children: "Summaries are largely aligned." })) })] })] }))] })] })) }));
}
function StatBlock({ label, value }) {
    return (_jsxs("div", { className: "rounded border border-white/10 px-3 py-2", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wide text-gray-500", children: label }), _jsx("p", { className: "text-sm font-semibold text-white", children: value ?? '—' })] }));
}
function formatPercent(value) {
    if (typeof value !== 'number') {
        return '—';
    }
    return `${Math.round(value * 100)}%`;
}
function extractUniqueSentences(a, b, ownerA, ownerB) {
    const sentencesA = normalizeSentences(a).map(text => ({ id: `a-${text}`, text }));
    const sentencesB = normalizeSentences(b).map(text => ({ id: `b-${text}`, text }));
    const setA = new Set(sentencesA.map(sentence => sentence.text));
    const setB = new Set(sentencesB.map(sentence => sentence.text));
    const uniques = [];
    sentencesA.forEach(sentence => {
        if (!setB.has(sentence.text)) {
            uniques.push({ owner: ownerA, text: sentence.text });
        }
    });
    sentencesB.forEach(sentence => {
        if (!setA.has(sentence.text)) {
            uniques.push({ owner: ownerB, text: sentence.text });
        }
    });
    return uniques.slice(0, 6);
}
function normalizeSentences(paragraph) {
    return paragraph
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
}
