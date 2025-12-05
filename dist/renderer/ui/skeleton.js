import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Skeleton Loaders - Unified loading states
 * Chrome-like skeleton screens for consistent UX
 */
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
const skeletonBase = 'bg-slate-800/60 rounded';
const skeletonAnimation = 'animate-pulse';
const variantStyles = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    rounded: 'rounded-lg',
};
export const Skeleton = React.forwardRef(({ variant = 'rectangular', width, height, animate = true, className, style, ...props }, ref) => {
    const variantClass = variantStyles[variant];
    const customStyle = {
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
    };
    const motionProps = {
        initial: { opacity: 0.6 },
        animate: { opacity: [0.6, 1, 0.6] },
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    };
    return (_jsx(motion.div, { ref: ref, className: cn(skeletonBase, variantClass, animate && skeletonAnimation, className), style: customStyle, ...motionProps, "aria-busy": "true", "aria-label": "Loading content", ...props }));
});
Skeleton.displayName = 'Skeleton';
/**
 * Skeleton Text - For text content
 */
export function SkeletonText({ lines = 3, className, ...props }) {
    return (_jsx("div", { className: cn('space-y-2', className), ...props, children: Array.from({ length: lines }).map((_, i) => (_jsx(Skeleton, { variant: "text", width: i === lines - 1 ? '75%' : '100%', className: "h-4" }, i))) }));
}
/**
 * Skeleton Card - For card content
 */
export function SkeletonCard({ className, ...props }) {
    return (_jsxs("div", { className: cn('rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3', className), "data-testid": "skeleton-card", ...props, children: [_jsx(Skeleton, { variant: "rectangular", height: 20, width: "60%" }), _jsx(SkeletonText, { lines: 3 }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Skeleton, { variant: "circular", width: 32, height: 32 }), _jsx(Skeleton, { variant: "text", width: "40%", height: 16 })] })] }));
}
/**
 * Skeleton List - For list content
 */
export function SkeletonList({ items = 5, className, ...props }) {
    return (_jsx("div", { className: cn('space-y-2', className), ...props, children: Array.from({ length: items }).map((_, i) => (_jsxs("div", { className: "flex items-center gap-3 p-2 rounded-lg", children: [_jsx(Skeleton, { variant: "circular", width: 40, height: 40 }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Skeleton, { variant: "text", width: "70%", height: 16 }), _jsx(Skeleton, { variant: "text", width: "50%", height: 12 })] })] }, i))) }));
}
/**
 * Skeleton Table - For table content
 */
export function SkeletonTable({ rows = 5, cols = 4, className, ...props }) {
    return (_jsxs("div", { className: cn('space-y-2', className), ...props, children: [_jsx("div", { className: "flex gap-2 pb-2 border-b border-slate-700/60", children: Array.from({ length: cols }).map((_, i) => (_jsx(Skeleton, { variant: "text", width: "100%", height: 20 }, i))) }), Array.from({ length: rows }).map((_, rowIdx) => (_jsx("div", { className: "flex gap-2", children: Array.from({ length: cols }).map((_, colIdx) => (_jsx(Skeleton, { variant: "text", width: "100%", height: 16 }, colIdx))) }, rowIdx)))] }));
}
