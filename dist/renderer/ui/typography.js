import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../lib/utils';
const headingSizeMap = {
    xs: 'text-base sm:text-lg',
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
};
export function Heading({ size = 'md', eyebrow, className, children, ...props }) {
    return (_jsxs("div", { className: cn('space-y-1.5', className), children: [eyebrow && (_jsx("p", { className: "text-[11px] uppercase tracking-[0.35em] text-[var(--text-muted)]", children: eyebrow })), _jsx("h2", { ...props, className: cn('font-semibold tracking-tight text-[var(--text-primary)]', headingSizeMap[size]), children: children })] }));
}
export function Text({ muted, subtle, className, children, ...props }) {
    return (_jsx("p", { ...props, className: cn('text-sm leading-relaxed', muted && 'text-[var(--text-muted)]', subtle && 'text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]', !muted && !subtle && 'text-[var(--text-primary)]', className), children: children }));
}
