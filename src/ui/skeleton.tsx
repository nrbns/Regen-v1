/**
 * Skeleton Loaders - Unified loading states
 * Chrome-like skeleton screens for consistent UX
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

const skeletonBase = 'bg-slate-800/60 rounded';
const skeletonAnimation = 'animate-pulse';

const variantStyles = {
  text: 'h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-md',
  rounded: 'rounded-lg',
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'rectangular', width, height, animate = true, className, style, ...props }, ref) => {
    const variantClass = variantStyles[variant];
    const customStyle: React.CSSProperties = {
      width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
      height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      ...style,
    };

    const motionProps = {
      initial: { opacity: 0.6 },
      animate: { opacity: [0.6, 1, 0.6] },
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(skeletonBase, variantClass, animate && skeletonAnimation, className)}
        style={customStyle}
        {...motionProps}
        aria-busy="true"
        aria-label="Loading content"
        {...(props as any)}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * Skeleton Text - For text content
 */
export function SkeletonText({
  lines = 3,
  className,
  ...props
}: { lines?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '75%' : '100%'} className="h-4" />
      ))}
    </div>
  );
}

/**
 * Skeleton Card - For card content
 */
export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3',
        className
      )}
      data-testid="skeleton-card"
      {...props}
    >
      <Skeleton variant="rectangular" height={20} width="60%" />
      <SkeletonText lines={3} />
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
    </div>
  );
}

/**
 * Skeleton List - For list content
 */
export function SkeletonList({
  items = 5,
  className,
  ...props
}: { items?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" height={16} />
            <Skeleton variant="text" width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton Table - For table content
 */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
  ...props
}: { rows?: number; cols?: number; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {/* Header */}
      <div className="flex gap-2 pb-2 border-b border-slate-700/60">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" height={20} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-2">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={colIdx} variant="text" width="100%" height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}
