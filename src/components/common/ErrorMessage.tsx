/**
 * Enhanced Error Message Component
 * User-friendly, actionable error messages
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({
  title = 'Something went wrong',
  message,
  details,
  actions,
  onRetry,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        p-4 rounded-lg border-2 border-red-500/50
        bg-red-50 dark:bg-red-900/20
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">
            {title}
          </h3>
          <p className="text-sm text-red-800 dark:text-red-300 mb-2">
            {message}
          </p>
          {details && (
            <details className="mt-2">
              <summary className="text-xs text-red-700 dark:text-red-400 cursor-pointer hover:underline">
                Show details
              </summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto">
                {details}
              </pre>
            </details>
          )}
          
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={onRetry}
              >
                Try Again
              </Button>
            )}
            {actions?.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant || 'secondary'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs text-red-700 dark:text-red-400 hover:underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

