/**
 * React Hook for Page Actions
 * Provides page action suggestions and execution with real-time task management
 */

import { useState, useEffect, useCallback } from 'react';
import { getSuggestedActions, type ActionSuggestion } from '../services/pageActions/actionEngine';
import type { DetectedIntent } from '../services/pageActions/intentDetector';
import { createTask, executeTask, cancelTask, logTask, streamOutput } from '../../core/execution/taskManager';

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
    // Create task immediately - this makes it visible in UI (MANDATORY)
    const task = createTask(`Action: ${suggestion.action.name}`, {
      intent: suggestion.intent,
      confidence: suggestion.confidence,
    });
    
    logTask(task.id, `Executing ${suggestion.action.name} action`);
    logTask(task.id, `Intent: ${suggestion.intent}, Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);

    try {
      // Execute through task manager (ENFORCED)
      await executeTask(task.id, async (taskParam, signal) => {
        // Check cancellation
        if (signal.aborted) {
          throw new Error('Cancelled');
        }

        // Execute the action with streaming
        streamOutput(taskParam.id, `Starting ${suggestion.action.name}...\n`);
        
        const result = await suggestion.execute();

        // Check cancellation after execution
        if (signal.aborted) {
          throw new Error('Cancelled');
        }

        // Stream the result
        if (typeof result === 'string') {
          streamOutput(taskParam.id, result);
        } else if (result && typeof result === 'object') {
          streamOutput(taskParam.id, JSON.stringify(result, null, 2));
        } else {
          streamOutput(taskParam.id, `Action completed successfully`);
        }

        logTask(taskParam.id, `Action ${suggestion.action.name} completed successfully`);
      });

      return { success: true };

    } catch (error: any) {
      if (error instanceof Error && error.message === 'Cancelled') {
        cancelTask(task.id);
        throw error;
      }
      logTask(task.id, `Action failed: ${error.message || 'Unknown error'}`);
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
