/**
 * React Hook for Page Actions
 * Provides page action suggestions and execution
 */

import { useState, useEffect, useCallback } from 'react';
import { getSuggestedActions, type ActionSuggestion } from '../services/pageActions/actionEngine';
import type { DetectedIntent } from '../services/pageActions/intentDetector';

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
    try {
      const result = await suggestion.execute();
      return result;
    } catch (error: any) {
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

