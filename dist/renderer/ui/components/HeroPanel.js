import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * HeroPanel / LaunchFlow Component
 * Hero section with quick actions and command bar
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, BookOpen, TrendingUp, Code } from 'lucide-react';
// Logo import - handle gracefully if file doesn't exist
// Logo will be loaded at runtime, so we don't need to import it here
const logo = '/logo.png';
import { useTokens } from '../useTokens';
import { Button } from '../button';
import { Container } from '../layout';
const QUICK_ACTIONS = [
    { id: 'search', label: 'Search', icon: Search, color: 'blue' },
    { id: 'research', label: 'Research', icon: Sparkles, color: 'purple' },
    { id: 'trade', label: 'Trade', icon: TrendingUp, color: 'green' },
    { id: 'dev', label: 'Dev Tools', icon: Code, color: 'orange' },
    { id: 'docs', label: 'Docs', icon: BookOpen, color: 'indigo' },
];
export function HeroPanel({ className, compact, onQuickAction }) {
    const tokens = useTokens();
    const [query, setQuery] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onQuickAction?.(query);
        }
    };
    return (_jsx("div", { className: `
        w-full bg-gradient-to-br from-[var(--surface-root)] via-[var(--surface-panel)] to-[var(--surface-elevated)]
        border-b border-[var(--surface-border)]
        ${className || ''}
      `, style: {
            paddingTop: compact ? tokens.spacing(8) : tokens.spacing(16),
            paddingBottom: compact ? tokens.spacing(8) : tokens.spacing(12),
        }, children: _jsx(Container, { children: _jsxs("div", { className: "max-w-4xl mx-auto text-center space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: "flex flex-col items-center gap-3", children: [logo && (_jsx("img", { src: logo, alt: "Regen logo", width: 72, height: 72, className: "drop-shadow-xl rounded-full bg-black/20 p-4" })), _jsx("h1", { className: "font-bold text-[var(--text-primary)] mb-2", style: { fontSize: compact ? tokens.fontSize['3xl'] : tokens.fontSize['5xl'] }, children: "Regen" }), _jsx("p", { className: "text-[var(--text-muted)]", style: { fontSize: tokens.fontSize.lg }, children: "Your intelligent browser for research, trading, and development" })] }), _jsx(motion.form, { onSubmit: handleSubmit, initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.1 }, className: "relative max-w-2xl mx-auto", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 20, className: "absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" }), _jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), placeholder: "Search, ask a question, or enter a URL...", className: "w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--surface-elevated)] border-2 border-[var(--surface-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all shadow-lg", style: { fontSize: tokens.fontSize.base }, "aria-label": "Command bar" }), _jsx("div", { className: "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2", children: _jsx("kbd", { className: "px-2 py-1 text-xs rounded bg-[var(--surface-panel)] border border-[var(--surface-border)] text-[var(--text-muted)]", children: "\u2318K" }) })] }) }), !compact && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.2 }, className: "flex items-center justify-center gap-3 flex-wrap", children: [_jsx("span", { className: "text-[var(--text-muted)] text-sm", style: { fontSize: tokens.fontSize.sm }, children: "Quick actions:" }), QUICK_ACTIONS.map(action => {
                                const Icon = action.icon;
                                return (_jsx(Button, { tone: "secondary", size: "sm", icon: _jsx(Icon, { size: 16 }), onClick: () => onQuickAction?.(action.id), children: action.label }, action.id));
                            })] }))] }) }) }));
}
