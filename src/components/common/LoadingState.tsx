/**
 * LoadingState - Standardized loading indicator component
 * Provides consistent loading UX across the application
 */

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export function LoadingState({ 
  message, 
  size = 'md', 
  fullScreen = false,
  className = ''
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center gap-2 text-gray-400 ${className}`}
    >
      <Loader2 
        className={`${sizeClasses[size]} animate-spin`} 
        aria-label="Loading"
        role="status"
      />
      {message && (
        <span className="text-sm animate-pulse" aria-live="polite">
          {message}
        </span>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
        role="dialog"
        aria-label="Loading"
        aria-busy="true"
      >
        {content}
      </div>
    );
  }

  return content;
}

/**
 * SkeletonLoader - Skeleton placeholder for better perceived performance
 */
interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
}

export function SkeletonLoader({ className = '', lines = 1 }: SkeletonLoaderProps) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-slate-800 rounded mb-2"
          style={{ height: '1rem', width: i === lines - 1 ? '80%' : '100%' }}
        >
          <div className="h-full w-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

