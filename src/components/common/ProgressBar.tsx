/**
 * ProgressBar - Animated progress indicator with smooth transitions
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ProgressBarProps {
  value?: number; // 0-100
  indeterminate?: boolean;
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'amber';
}

export function ProgressBar({
  value = 0,
  indeterminate = false,
  className = '',
  showLabel = false,
  color = 'blue',
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Smooth value transitions
  useEffect(() => {
    if (!indeterminate && typeof value === 'number') {
      const clamped = Math.max(0, Math.min(100, value));
      setDisplayValue(clamped);
    }
  }, [value, indeterminate]);

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  };

  const gradientClasses = {
    blue: 'from-blue-500 via-cyan-500 to-blue-500',
    green: 'from-emerald-500 via-green-500 to-emerald-500',
    purple: 'from-purple-500 via-pink-500 to-purple-500',
    amber: 'from-amber-500 via-yellow-500 to-amber-500',
  };

  if (indeterminate) {
    return (
      <div className={`relative h-1.5 w-full overflow-hidden rounded-full bg-gray-800/60 ${className}`}>
        <motion.div
          className={`h-full bg-gradient-to-r ${gradientClasses[color]}`}
          initial={{ x: '-100%' }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ width: '40%' }}
        />
      </div>
    );
  }

  return (
    <div className={`relative h-1.5 w-full overflow-hidden rounded-full bg-gray-800/60 ${className}`}>
      <motion.div
        className={`h-full bg-gradient-to-r ${gradientClasses[color]}`}
        initial={{ width: 0 }}
        animate={{ width: `${displayValue}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-300">
          {Math.round(displayValue)}%
        </div>
      )}
    </div>
  );
}

