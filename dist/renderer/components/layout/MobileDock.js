import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { Bot, FlaskConical, Globe, Library, LineChart } from 'lucide-react';
const navItems = [
    { id: 'Browse', label: 'Browse', icon: Globe },
    { id: 'Research', label: 'Research', icon: FlaskConical },
    { id: 'Trade', label: 'Trade', icon: LineChart },
];
export function MobileDock({ activeMode, onSelectMode, onOpenLibrary, onOpenAgent, }) {
    return (_jsx(motion.nav, { initial: { y: 120, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 120, opacity: 0 }, transition: { type: 'spring', stiffness: 260, damping: 30 }, className: "fixed inset-x-0 bottom-0 z-[65] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3", children: _jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl", children: [navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = item.id === activeMode;
                    return (_jsxs("button", { type: "button", onClick: () => onSelectMode(item.id), className: `flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition ${isActive
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'text-slate-400 hover:text-slate-100'}`, "aria-pressed": isActive, children: [_jsx(Icon, { size: 20 }), _jsx("span", { children: item.label })] }, item.id));
                }), _jsxs("button", { type: "button", onClick: onOpenLibrary, className: "flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:text-slate-100", children: [_jsx(Library, { size: 20 }), _jsx("span", { children: "Library" })] }), _jsxs("button", { type: "button", onClick: onOpenAgent, className: "flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:text-slate-100", children: [_jsx(Bot, { size: 20 }), _jsx("span", { children: "Agent" })] })] }) }));
}
