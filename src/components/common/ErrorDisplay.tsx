/**
 * ErrorDisplay - Standardized error message component
 * Provides consistent error UX with accessibility support
 */

import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorDisplayProps {
  error: string | Error | null;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  duration?: number;
  className?: string;
  variant?: 'default' | 'inline' | 'banner';
}

export function ErrorDisplay({ 
  error, 
  onDismiss, 
  autoDismiss = false, 
  duration = 5000,
  className = '',
  variant = 'default'
}: ErrorDisplayProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  useEffect(() => {
    if (autoDismiss && errorMessage && onDismiss) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, autoDismiss, duration, onDismiss]);

  const variantClasses = {
    default: 'rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3',
    inline: 'text-sm text-red-400',
    banner: 'border-b border-red-500/40 bg-red-500/10 px-4 py-2',
  };

  return (
    <AnimatePresence>
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: variant === 'banner' ? -10 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: variant === 'banner' ? -10 : 0 }}
          role="alert"
          aria-live="assertive"
          className={`${variantClasses[variant]} text-sm text-red-200 flex items-start gap-3 ${className}`}
        >
          <AlertTriangle 
            size={variant === 'inline' ? 14 : 16} 
            className="flex-shrink-0 mt-0.5" 
            aria-hidden="true" 
          />
          <span className="flex-1">{errorMessage}</span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Dismiss error"
              className="text-red-300/60 hover:text-red-200 transition-colors flex-shrink-0"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

