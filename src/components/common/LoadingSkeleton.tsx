/**
 * LoadingSkeleton - Reusable skeleton loader for AI operations
 * Provides visual feedback during async operations
 */

import { motion } from 'framer-motion';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'list' | 'table' | 'custom';
  lines?: number;
  className?: string;
  children?: React.ReactNode;
}

const shimmerAnimation = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 0.6, 0.3],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export function LoadingSkeleton({
  variant = 'text',
  lines = 3,
  className = '',
  children,
}: SkeletonProps) {
  if (children) {
    return (
      <div className={`animate-pulse ${className}`}>
        <motion.div
          variants={shimmerAnimation}
          initial="initial"
          animate="animate"
          className="h-full w-full rounded bg-gray-800/50"
        >
          {children}
        </motion.div>
      </div>
    );
  }

  switch (variant) {
    case 'text':
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <motion.div
              key={i}
              variants={shimmerAnimation}
              initial="initial"
              animate="animate"
              className="h-4 rounded bg-gray-800/50"
              style={{ width: i === lines - 1 ? '75%' : '100%' }}
            />
          ))}
        </div>
      );

    case 'card':
      return (
        <motion.div
          variants={shimmerAnimation}
          initial="initial"
          animate="animate"
          className={`rounded-lg border border-gray-800 bg-gray-900/50 p-4 ${className}`}
        >
          <div className="mb-3 h-4 w-3/4 rounded bg-gray-800/50" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-800/50" />
            <div className="h-3 w-5/6 rounded bg-gray-800/50" />
          </div>
        </motion.div>
      );

    case 'list':
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <motion.div
              key={i}
              variants={shimmerAnimation}
              initial="initial"
              animate="animate"
              className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3"
            >
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-800/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-800/50" />
                <div className="h-3 w-1/2 rounded bg-gray-800/50" />
              </div>
            </motion.div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className={`space-y-2 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <motion.div
              key={i}
              variants={shimmerAnimation}
              initial="initial"
              animate="animate"
              className="flex gap-4 rounded border border-gray-800 bg-gray-900/50 p-3"
            >
              <div className="h-4 w-1/4 rounded bg-gray-800/50" />
              <div className="h-4 w-1/4 rounded bg-gray-800/50" />
              <div className="h-4 w-1/4 rounded bg-gray-800/50" />
              <div className="h-4 w-1/4 rounded bg-gray-800/50" />
            </motion.div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/**
 * AIThinkingSkeleton - Specialized skeleton for AI operations
 */
export function AIThinkingSkeleton({ message = 'AI is thinking...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-gray-700 border-t-emerald-400"
      />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-gray-800/50">{message}</div>
        <div className="h-3 w-48 rounded bg-gray-800/50" />
      </div>
    </div>
  );
}
