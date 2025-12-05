import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock3, Star } from 'lucide-react';
const DEFAULT_TIMEFRAMES = [
    { value: '1', label: '1m', description: 'Scalping' },
    { value: '5', label: '5m', description: 'Short-term' },
    { value: '15', label: '15m' },
    { value: '60', label: '1h' },
    { value: '240', label: '4h' },
    { value: '1D', label: '1D', description: 'Daily swing' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M', description: 'Macro' },
];
export default function TimeframeSelector({ value, onChange, options = DEFAULT_TIMEFRAMES, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-[#0a0d15] p-4 text-white shadow-inner shadow-black/40", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between text-xs uppercase tracking-wide", children: [_jsxs("div", { className: "flex items-center gap-2 text-indigo-200", children: [_jsx(Clock3, { size: 16 }), "Timeframe"] }), _jsxs("div", { className: "flex items-center gap-1 text-[11px] text-gray-400", children: [_jsx(Star, { size: 12, className: "text-amber-400" }), "Preferred: ", options.find(option => option.value === value)?.label ?? value] })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: options.map(option => {
                    const isActive = value === option.value;
                    return (_jsxs("button", { type: "button", onClick: () => onChange(option.value), className: `flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${isActive
                            ? 'border-indigo-500/80 bg-indigo-500/20 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                            : 'border-white/10 text-gray-300 hover:border-white/40 hover:text-white'}`, children: [_jsx("span", { children: option.label }), option.description && (_jsx("span", { className: "text-[11px] font-normal text-gray-400", children: option.description }))] }, option.value));
                }) })] }));
}
