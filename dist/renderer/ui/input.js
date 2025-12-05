import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '../lib/utils';
export const Input = forwardRef(({ className, leadingIcon, trailingIcon, disabled, ...props }, ref) => {
    return (_jsxs("label", { className: cn('inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-primary)] transition focus-within:border-[var(--surface-border-strong)] focus-within:ring-2 focus-within:ring-[var(--accent)]', disabled && 'opacity-60 cursor-not-allowed', className), children: [leadingIcon && _jsx("span", { className: "text-[var(--text-muted)]", children: leadingIcon }), _jsx("input", { ...props, ref: ref, disabled: disabled, className: "h-full flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" }), trailingIcon && _jsx("span", { className: "text-[var(--text-muted)]", children: trailingIcon })] }));
});
Input.displayName = 'Input';
export const TextArea = forwardRef(({ className, label, disabled, ...props }, ref) => (_jsxs("div", { className: "space-y-1.5", children: [label && (_jsx("p", { className: "text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]", children: label })), _jsx("textarea", { ...props, ref: ref, disabled: disabled, className: cn('w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--surface-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]', disabled && 'opacity-60 cursor-not-allowed', className) })] })));
TextArea.displayName = 'TextArea';
