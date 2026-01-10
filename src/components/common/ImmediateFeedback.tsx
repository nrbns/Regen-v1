/**
 * Immediate Feedback Component
 *
 * Ensures <300ms visible reaction rule - no silent moments ever.
 * Shows immediate feedback for any async action.
 */

import React from 'react';
import { Loader2, Sparkles, Brain, Search, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type FeedbackType = 'thinking' | 'understanding' | 'processing' | 'searching' | 'analyzing';

export interface ImmediateFeedbackProps {
  type: FeedbackType;
  message?: string;
  visible: boolean;
}

// FIX: Map feedback types to SystemStatus for consistency
// These feedback types are UI-level, but should align with backend status
const feedbackConfig: Record<FeedbackType, { icon: React.ReactNode; defaultMessage: string; systemStatus: 'idle' | 'working' | 'recovering' }> = {
  thinking: {
    icon: <Brain className="h-4 w-4 animate-pulse" />,
    defaultMessage: 'Working...', // FIX: Changed from "Thinking..." to align with SystemStatus
    systemStatus: 'working',
  },
  understanding: {
    icon: <Sparkles className="h-4 w-4 animate-pulse" />,
    defaultMessage: 'Working...', // FIX: Changed to align with SystemStatus
    systemStatus: 'working',
  },
  processing: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    defaultMessage: 'Working...', // FIX: Changed from "Processing..." to align with SystemStatus
    systemStatus: 'working',
  },
  searching: {
    icon: <Search className="h-4 w-4 animate-pulse" />,
    defaultMessage: 'Working...', // FIX: Changed to align with SystemStatus
    systemStatus: 'working',
  },
  analyzing: {
    icon: <Zap className="h-4 w-4 animate-pulse" />,
    defaultMessage: 'Working...', // FIX: Changed to align with SystemStatus
    systemStatus: 'working',
  },
};

export function ImmediateFeedback({ type, message, visible }: ImmediateFeedbackProps) {
  if (!visible) return null;

  const config = feedbackConfig[type];
  const displayMessage = message || config.defaultMessage;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed left-1/2 top-20 z-[180] -translate-x-1/2 transform"
        >
          <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <div className="text-blue-400">{config.icon}</div>
            <span className="whitespace-nowrap text-sm text-slate-200">{displayMessage}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Cursor animation feedback (for text input areas)
 */
export function CursorThinkingAnimation() {
  return (
    <motion.span
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
      className="ml-1 inline-block h-4 w-0.5 bg-blue-400"
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton token for streaming responses
 */
export function ThinkingSkeletonToken() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="ml-1 inline-block h-4 w-2 rounded bg-slate-600"
      aria-hidden="true"
    />
  );
}
