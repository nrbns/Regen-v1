/**
 * Zero-Prompt Suggestions Component - v0.4 Week 1
 * Displays preemptive agent suggestions based on context
 */

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  predictZeroPromptActions,
  trackUserAction,
  type PredictedAction,
} from '../services/zeroPromptPrediction';
import { executeAgenticAction } from '../services/agenticActionExecutor';
import { useAppStore } from '../state/appStore';
import { toast } from '../utils/toast';

interface Props {
  maxSuggestions?: number;
  autoRefresh?: boolean;
}

export function ZeroPromptSuggestions({ maxSuggestions = 3, autoRefresh = true }: Props) {
  const [predictions, setPredictions] = useState<PredictedAction[]>([]);
  const [loading, setLoading] = useState(false);
  const mode = useAppStore(state => state.mode);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const preds = await predictZeroPromptActions(maxSuggestions);
      setPredictions(preds);
    } catch (error) {
      console.warn('[ZeroPrompt] Failed to load predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();

    if (autoRefresh) {
      // Refresh predictions when mode changes or every 30s
      const interval = setInterval(loadPredictions, 30000);
      return () => clearInterval(interval);
    }
  }, [mode, maxSuggestions, autoRefresh]);

  const handleSuggestionClick = async (prediction: PredictedAction) => {
    trackUserAction(prediction.prompt);
    toast.info(`Executing: ${prediction.prompt}...`);

    try {
      const result = await executeAgenticAction(prediction.prompt, { mode });
      if (result.success) {
        toast.success('Action completed');
        // Refresh predictions after action
        setTimeout(loadPredictions, 1000);
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      console.error('[ZeroPrompt] Action execution failed:', error);
      toast.error('Failed to execute action');
    }
  };

  if (predictions.length === 0 && !loading) {
    return null; // Don't show empty state
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600">
        <Sparkles className="h-3 w-3" />
        <span>Suggested actions</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {predictions.map((pred, i) => (
          <button
            key={i}
            onClick={() => handleSuggestionClick(pred)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-100"
            title={`Confidence: ${Math.round(pred.confidence * 100)}% - ${pred.context}`}
          >
            {pred.prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
