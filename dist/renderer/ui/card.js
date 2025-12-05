import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '../lib/utils';
const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};
const surfaceMap = {
    panel: 'bg-[var(--surface-panel)] border border-[var(--surface-border)]',
    elevated: 'bg-[var(--surface-elevated)] border border-[var(--surface-border-strong)] shadow-[0_15px_30px_rgba(0,0,0,0.25)]',
    transparent: 'bg-transparent border border-transparent',
};
export const Card = forwardRef(({ className, padding = 'md', surface = 'panel', ...props }, ref) => (_jsx("div", { ...props, ref: ref, className: cn('rounded-[var(--layout-radius)] transition-colors duration-150', paddingMap[padding], surfaceMap[surface], className) })));
Card.displayName = 'Card';
export const CardHeader = ({ className, ...props }) => _jsx("div", { className: cn('space-y-1', className), ...props });
export const CardTitle = ({ className, ...props }) => (_jsx("h3", { className: cn('text-lg font-semibold tracking-tight text-[var(--text-primary)]', className), ...props }));
export const CardDescription = ({ className, ...props }) => _jsx("p", { className: cn('text-sm text-[var(--text-muted)]', className), ...props });
export const CardContent = ({ className, ...props }) => _jsx("div", { className: cn('text-[var(--text-primary)]', className), ...props });
export const CardFooter = ({ className, ...props }) => _jsx("div", { className: cn('flex items-center justify-between pt-4', className), ...props });
