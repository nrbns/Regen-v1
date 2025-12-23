/**
 * Async Action Wrapper
 *
 * Higher-order component that automatically adds <300ms immediate feedback
 * to any async action. Wraps button/form submissions to show feedback instantly.
 */

import React, { useState, useCallback, ReactNode } from 'react';
import { useImmediateFeedback } from '../../hooks/useImmediateFeedback';
import { type FeedbackType } from './ImmediateFeedback';

interface AsyncActionWrapperProps {
  children: (props: {
    onClick: () => void | Promise<void>;
    disabled: boolean;
    isLoading: boolean;
  }) => ReactNode;
  action: () => Promise<void>;
  feedbackType?: FeedbackType;
  feedbackMessage?: string;
}

export function AsyncActionWrapper({
  children,
  action,
  feedbackType = 'processing',
  feedbackMessage,
}: AsyncActionWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const feedback = useImmediateFeedback({ type: feedbackType, message: feedbackMessage });

  const handleClick = useCallback(async () => {
    if (isLoading) return;

    // Show feedback immediately (<300ms rule)
    feedback.show();
    setIsLoading(true);

    try {
      await action();
    } catch (error) {
      console.error('[AsyncActionWrapper] Action failed:', error);
    } finally {
      feedback.hide();
      setIsLoading(false);
    }
  }, [action, isLoading, feedback]);

  return (
    <>
      <feedback.Feedback />
      {children({
        onClick: handleClick,
        disabled: isLoading,
        isLoading,
      })}
    </>
  );
}
