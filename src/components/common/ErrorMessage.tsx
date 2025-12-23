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
      className={`rounded-lg border-2 border-red-500/50 bg-red-50 p-4 dark:bg-red-900/20 ${className} `}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-sm font-semibold text-red-900 dark:text-red-400">{title}</h3>
          <p className="mb-2 text-sm text-red-800 dark:text-red-300">{message}</p>
          {details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-700 hover:underline dark:text-red-400">
                Show details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-500">
                {details}
              </pre>
            </details>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RefreshCw className="h-4 w-4" />}
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
                className="text-xs text-red-700 hover:underline dark:text-red-400"
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
