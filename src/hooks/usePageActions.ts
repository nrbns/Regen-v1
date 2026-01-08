/**
 * React Hook for Page Actions
 * Provides page action suggestions and execution with real-time task management
 */

import { useState, useEffect, useCallback } from 'react';
import { getSuggestedActions, type ActionSuggestion } from '../services/pageActions/actionEngine';
import type { DetectedIntent } from '../services/pageActions/intentDetector';
import { createTask, start, stream, log, complete, fail } from '../../core/execution/taskManager';

export function usePageActions(selectedText?: string) {
  const [suggestions, setSuggestions] = useState<ActionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [intent] = useState<DetectedIntent | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const actions = await getSuggestedActions({ selectedText });
      setSuggestions(actions);
    } catch (error) {
      console.error('Failed to load page actions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedText]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const executeAction = useCallback(async (suggestion: ActionSuggestion) => {
    // Create task immediately - this makes it visible in UI
    const task = createTask(`Action: ${suggestion.action.name}`);
    log(task, `Executing ${suggestion.action.name} action`);
    log(task, `Intent: ${suggestion.intent}, Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);

    try {
      // Start the task execution
      start(task);

      // Execute the action with streaming
      stream(task, `Starting ${suggestion.action.name}...\n`);
      const result = await suggestion.execute();

      // Stream the result
      if (typeof result === 'string') {
        stream(task, result);
      } else if (result && typeof result === 'object') {
        stream(task, JSON.stringify(result, null, 2));
      } else {
        stream(task, `Action completed successfully`);
      }

      log(task, `Action ${suggestion.action.name} completed successfully`);
      complete(task);
      return result;

    } catch (error: any) {
      log(task, `Action failed: ${error.message}`);
      fail(task, error.message || 'Failed to execute action');
      throw new Error(error.message || 'Failed to execute action');
    }
  }, []);

  return {
    suggestions,
    loading,
    intent,
    loadSuggestions,
    executeAction,
  };
}
