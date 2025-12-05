import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, AnimatePresence } from 'framer-motion';
import { setPowerMode } from '../../core/redix/power-modes';
const MODE_CARDS = [
    {
        id: 'Performance',
        title: 'Performance',
        description: 'Full power, no throttling. Ideal when plugged in.',
        metrics: 'Max tabs · High AI throughput',
    },
    {
        id: 'Balanced',
        title: 'Balanced',
        description: 'Smart defaults for everyday browsing.',
        metrics: 'Adaptive caps · Standard prefetch',
    },
    {
        id: 'PowerSave',
        title: 'Power-save',
        description: 'Aggressive throttling to extend battery life.',
        metrics: 'Lower tab caps · Prefetch paused',
    },
    {
        id: 'Auto',
        title: 'Auto',
        description: 'Automatically chooses the best mode using battery signals.',
        metrics: 'Smart switching',
    },
];
export function PowerModeSelector({ selected, effective, onClose, onSelect }) {
    return (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4", children: _jsxs(motion.div, { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 20, opacity: 0 }, className: "w-full max-w-3xl rounded-[32px] border border-white/10 bg-slate-950/90 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.55)]", children: [_jsxs("header", { className: "mb-6 flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-[0.4em] text-slate-500", children: "Power modes" }), _jsx("h2", { className: "text-2xl font-semibold text-white", children: "Optimize Redix for the moment" }), _jsx("p", { className: "text-sm text-slate-400", children: selected === 'Auto'
                                            ? `Auto is managing power. Currently running ${effective}.`
                                            : `Active mode: ${selected}. Switch whenever you need.` })] }), _jsx("button", { type: "button", onClick: onClose, className: "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 hover:border-white/40", children: "Close" })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2", children: MODE_CARDS.map(card => {
                            const isSelected = selected === card.id;
                            const isEffective = card.id !== 'Auto' && effective === card.id;
                            return (_jsxs("button", { type: "button", onClick: () => {
                                    setPowerMode(card.id);
                                    onSelect(card.id);
                                }, className: `flex h-full flex-col items-start gap-2 rounded-3xl border px-4 py-4 text-left transition ${isSelected
                                    ? 'border-purple-400/70 bg-purple-500/10 shadow-[0_0_25px_rgba(168,85,247,0.2)]'
                                    : 'border-white/10 bg-white/5 hover:border-white/30'}`, children: [_jsxs("div", { className: "flex w-full items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold text-white", children: card.title }), _jsx("p", { className: "text-xs text-slate-400", children: card.metrics })] }), isSelected && (_jsx("span", { className: "rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200", children: "Active" }))] }), _jsx("p", { className: "text-sm text-slate-300", children: card.description }), card.id === 'Auto' && isEffective && (_jsxs("p", { className: "text-xs text-emerald-300", children: ["Auto is currently running ", effective] }))] }, card.id));
                        }) })] }) }) }));
}
