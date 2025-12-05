import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * EcoBadge - Real-time eco feedback component
 * Shows green tier, score, and CO2 saved
 */
import { motion } from 'framer-motion';
import { Leaf, Flame, Sun, Sparkles } from 'lucide-react';
const tierConfig = {
    'Ultra Green': {
        color: '#10b981', // emerald-500
        icon: Sparkles,
        message: 'AI healed the planet!',
    },
    'Green': {
        color: '#22c55e', // green-500
        icon: Leaf,
        message: 'Eco-friendly response',
    },
    'Yellow': {
        color: '#f59e0b', // amber-500
        icon: Sun,
        message: 'Moderate energy use',
    },
    'Red': {
        color: '#ef4444', // red-500
        icon: Flame,
        message: 'High energy — optimize!',
    },
};
export function EcoBadge({ score, tier, co2SavedG = 0, className = '' }) {
    const config = tierConfig[tier];
    const Icon = config.icon;
    return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, className: `flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm ${className}`, style: {
            borderColor: `${config.color}40`,
            backgroundColor: `${config.color}10`,
        }, children: [_jsx(Icon, { size: 16, style: { color: config.color } }), _jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsxs("span", { style: { color: config.color }, className: "font-semibold", children: [score, "%"] }), co2SavedG > 0 && (_jsxs("span", { className: "text-gray-400", children: ["\u2022 Saved ", co2SavedG.toFixed(1), "g CO\u2082"] }))] }), _jsx("div", { className: "text-[10px] opacity-70", style: { color: config.color }, title: config.message, children: tier })] }));
}
// Compact version for status bar
export function EcoBadgeCompact({ score, tier, co2SavedG = 0 }) {
    const config = tierConfig[tier];
    const Icon = config.icon;
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "flex items-center gap-1.5 px-2 py-1 rounded-md border backdrop-blur-sm", style: {
            borderColor: `${config.color}40`,
            backgroundColor: `${config.color}10`,
        }, title: `${tier}: ${score}% • ${config.message}${co2SavedG > 0 ? ` • Saved ${co2SavedG.toFixed(1)}g CO₂` : ''}`, children: [_jsx(Icon, { size: 12, style: { color: config.color } }), _jsxs("span", { style: { color: config.color }, className: "text-[10px] font-semibold", children: [score, "%"] }), co2SavedG > 0 && (_jsxs("span", { className: "text-[9px] text-gray-400", children: [co2SavedG.toFixed(1), "g"] }))] }));
}
