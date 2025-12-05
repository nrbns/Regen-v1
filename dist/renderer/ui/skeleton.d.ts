/**
 * Skeleton Loaders - Unified loading states
 * Chrome-like skeleton screens for consistent UX
 */
import React from 'react';
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animate?: boolean;
}
export declare const Skeleton: React.ForwardRefExoticComponent<SkeletonProps & React.RefAttributes<HTMLDivElement>>;
/**
 * Skeleton Text - For text content
 */
export declare function SkeletonText({ lines, className, ...props }: {
    lines?: number;
    className?: string;
} & React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton Card - For card content
 */
export declare function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton List - For list content
 */
export declare function SkeletonList({ items, className, ...props }: {
    items?: number;
    className?: string;
} & React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton Table - For table content
 */
export declare function SkeletonTable({ rows, cols, className, ...props }: {
    rows?: number;
    cols?: number;
    className?: string;
} & React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
