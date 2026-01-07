/**
 * Skeleton - Loading placeholder with pulse animation
 * Used for better perceived performance during data loading
 */

import { motion } from 'framer-motion';
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animated?: boolean;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animated = true,
}: SkeletonProps) {
  const baseClasses = 'bg-slate-800/60 rounded';
  const variantClasses = {
    text: 'h-4',
    rectangular: '',
    circular: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const pulseAnimation = animated
    ? {
        opacity: [0.4, 0.8, 0.4],
        scale: [1, 1.02, 1],
        transition: {
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }
    : {};

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={`${baseClasses} ${variantClasses.text} ${className}`}
            style={{ ...style, width: i === lines - 1 ? '80%' : '100%' }}
            animate={pulseAnimation}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      animate={pulseAnimation}
    />
  );
}

/**
 * CardSkeleton - Pre-built skeleton for card layouts
 */
export function CardSkeleton({ className = '', count = 1 }: { className?: string; count?: number }) {
  if (count > 1) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4"
          >
            <Skeleton variant="rectangular" height={20} width="60%" className="mb-3" />
            <Skeleton variant="text" lines={2} className="mb-2" />
            <div className="flex items-center gap-2 mt-3">
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="40%" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 ${className}`}
    >
      <Skeleton variant="rectangular" height={20} width="60%" className="mb-3" />
      <Skeleton variant="text" lines={2} className="mb-2" />
      <div className="flex items-center gap-2 mt-3">
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width="40%" />
      </div>
    </motion.div>
  );
}

/**
 * ListSkeleton - Pre-built skeleton for list items
 */
export function ListSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/40">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

