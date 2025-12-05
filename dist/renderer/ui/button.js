import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
const toneClassMap = {
    primary: 'bg-[var(--color-primary-600)] text-white shadow-[0_12px_20px_rgba(37,99,235,0.25)] hover:bg-[var(--color-primary-500)] focus-visible:ring-[var(--color-primary-400)]',
    secondary: 'bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--surface-border-strong)]',
    ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--surface-border)]',
    danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c] focus-visible:ring-[#f87171]',
};
const sizeClassMap = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
};
export const Button = forwardRef(({ tone = 'primary', size = 'md', loading = false, icon, trailingIcon, fullWidth, disabled, className, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (_jsx(motion.button, { ...props, ref: ref, className: cn('inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-root)]', toneClassMap[tone], sizeClassMap[size], fullWidth && 'w-full', isDisabled && 'opacity-50 cursor-not-allowed', className), disabled: isDisabled, whileHover: !isDisabled ? { scale: 1.015 } : undefined, whileTap: !isDisabled ? { scale: 0.97 } : undefined, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "animate-spin", size: size === 'sm' ? 14 : size === 'md' ? 16 : 18 }), _jsx("span", { children: "Loading" })] })) : (_jsxs(_Fragment, { children: [icon && _jsx("span", { className: "flex-shrink-0", children: icon }), children && _jsx("span", { className: "truncate", children: children }), trailingIcon && _jsx("span", { className: "flex-shrink-0", children: trailingIcon })] })) }));
});
Button.displayName = 'Button';
export const IconButton = forwardRef(({ icon, size = 'md', ...props }, ref) => {
    const iconSize = size === 'sm' ? 16 : size === 'md' ? 18 : 20;
    return (_jsx(Button, { ref: ref, ...props, size: size, className: cn('rounded-full p-0', size === 'sm' && 'w-8 h-8', size === 'md' && 'w-10 h-10', size === 'lg' && 'w-12 h-12', props.className), children: _jsx("span", { style: { width: iconSize, height: iconSize }, className: "flex items-center justify-center", children: icon }) }));
});
IconButton.displayName = 'IconButton';
export const FAB = forwardRef(({ position = 'bottom-right', fixed = true, className, ...props }, ref) => {
    const positionClasses = {
        'bottom-right': fixed ? 'fixed bottom-6 right-6' : '',
        'bottom-left': fixed ? 'fixed bottom-6 left-6' : '',
        'top-right': fixed ? 'fixed top-6 right-6' : '',
        'top-left': fixed ? 'fixed top-6 left-6' : '',
    };
    return (_jsx(Button, { ref: ref, ...props, size: "lg", className: cn('rounded-full shadow-lg z-50', positionClasses[position], className) }));
});
FAB.displayName = 'FAB';
