/**
 * Hook for immediate feedback (<300ms rule)
 *
 * Ensures every async action shows visible feedback immediately.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ImmediateFeedback, type FeedbackType } from '../components/common/ImmediateFeedback';

interface UseImmediateFeedbackOptions {
  type?: FeedbackType;
  message?: string;
  delay?: number; // Delay before showing (default: 0ms for immediate)
}

export function useImmediateFeedback(options: UseImmediateFeedbackOptions = {}) {
  const { type = 'processing', message, delay = 0 } = options;
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const show = useCallback(
    (_customMessage?: string) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Show immediately (or after delay if specified)
      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          setVisible(true);
        }, delay);
      } else {
        setVisible(true);
      }
    },
    [delay]
  );

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const Feedback = useCallback(
    () => React.createElement(ImmediateFeedback, { type, message, visible }),
    [type, message, visible]
  );

  return {
    show,
    hide,
    visible,
    Feedback,
  };
}

/**
 * Wrapper for async functions with immediate feedback
 */
export function withImmediateFeedback<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: UseImmediateFeedbackOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const { show, hide } = useImmediateFeedback(options);

    // Show feedback immediately (< 300ms)
    show();

    try {
      const result = await fn(...args);
      hide();
      return result;
    } catch (error) {
      hide();
      throw error;
    }
  }) as T;
}

/**
 * Hook for tracking async action states with immediate feedback
 */
export function useAsyncAction() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { show, hide, Feedback } = useImmediateFeedback({ type: 'processing' });

  const execute = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | null> => {
      setIsRunning(true);
      setError(null);
      show();

      try {
        const result = await action();
        hide();
        setIsRunning(false);
        return result;
      } catch (err) {
        hide();
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsRunning(false);
        return null;
      }
    },
    [show, hide]
  );

  return {
    execute,
    isRunning,
    error,
    Feedback,
  };
}
