/**
 * AI Undo/Feedback Component
 * Provides undo functionality for AI actions
 * Shows feedback options for AI suggestions
 */

import React, { useState, useEffect } from 'react';
import { Undo2, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { eventBus, EVENTS } from '../../core/state/eventBus';

interface AIAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  undoable: boolean;
}

export function AIUndoFeedback() {
  const [recentActions, setRecentActions] = useState<AIAction[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    // Listen for AI actions
    const handleAIAction = (action: any) => {
      if (action.type && action.undoable !== false) {
        setRecentActions(prev => [
          {
            id: `action_${Date.now()}`,
            type: action.type,
            description: action.description || `AI ${action.type}`,
            timestamp: Date.now(),
            undoable: action.undoable !== false,
          },
          ...prev.slice(0, 4), // Keep last 5 actions
        ]);
        setShowFeedback(true);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowFeedback(false);
        }, 5000);
      }
    };

    eventBus.on(EVENTS.AI_SUGGESTION_GENERATED, handleAIAction);
    eventBus.on('ai:action:executed', handleAIAction);

    return () => {
      eventBus.off(EVENTS.AI_SUGGESTION_GENERATED, handleAIAction);
      eventBus.off('ai:action:executed', handleAIAction);
    };
  }, []);

  const handleUndo = (action: AIAction) => {
    // Emit undo event
    eventBus.emit('ai:action:undo', {
      actionId: action.id,
      type: action.type,
    });
    
    // Remove from recent actions
    setRecentActions(prev => prev.filter(a => a.id !== action.id));
    setShowFeedback(false);
  };

  const handleFeedback = (action: AIAction, positive: boolean) => {
    // Emit feedback event
    eventBus.emit('ai:action:feedback', {
      actionId: action.id,
      type: action.type,
      positive,
    });
    
    // Remove from recent actions
    setRecentActions(prev => prev.filter(a => a.id !== action.id));
    if (recentActions.length === 1) {
      setShowFeedback(false);
    }
  };

  if (!showFeedback || recentActions.length === 0) {
    return null;
  }

  const latestAction = recentActions[0];

  return (
    <div 
      className="fixed bottom-20 right-2 md:right-4 z-40 w-[calc(100vw-1rem)] md:w-80 max-w-sm rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 md:p-4 shadow-lg backdrop-blur-sm animate-slide-up"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {latestAction.description}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {new Date(latestAction.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <button
          onClick={() => setShowFeedback(false)}
          className="ml-2 rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="Close feedback"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {latestAction.undoable && (
          <button
            onClick={() => handleUndo(latestAction)}
            className="flex items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-active)] hover:text-[var(--text-primary)] active:scale-95"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </button>
        )}
        <button
          onClick={() => handleFeedback(latestAction, true)}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10 px-3 py-1.5 text-sm text-[var(--color-success-500)] transition-all hover:bg-[var(--color-success-500)]/20 active:scale-95"
        >
          <ThumbsUp className="h-4 w-4" />
          Good
        </button>
        <button
          onClick={() => handleFeedback(latestAction, false)}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 px-3 py-1.5 text-sm text-[var(--color-error-500)] transition-all hover:bg-[var(--color-error-500)]/20 active:scale-95"
        >
          <ThumbsDown className="h-4 w-4" />
          Not helpful
        </button>
      </div>
    </div>
  );
}
