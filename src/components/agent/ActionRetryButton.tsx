/**
 * Action Retry Button - Allows retrying failed actions
 */

import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { executeAgentActions } from '../../services/agenticActions';
import { useVoiceControlStore } from '../../state/agentStreamStore';
import { useState } from 'react';

interface ActionRetryButtonProps {
  action: string;
  onRetry?: () => void;
}

export function ActionRetryButton({ action, onRetry }: ActionRetryButtonProps) {
  const [retrying, setRetrying] = useState(false);
  const { setActionProgress, setActionResults, actionResults, actions } = useVoiceControlStore();

  const handleRetry = async () => {
    if (retrying) return;

    setRetrying(true);
    setActionProgress(action, {
      action,
      status: 'running',
      progress: 0,
      message: 'Retrying...',
    });

    try {
      const results = await executeAgentActions([action], (action, progress) => {
        setActionProgress(action, {
          action,
          ...progress,
        });
      });

      // Update results
      const actionIndex = actions.indexOf(action);
      if (actionIndex >= 0 && results[0]) {
        const newResults = [...actionResults];
        newResults[actionIndex] = results[0];
        setActionResults(newResults);
      }

      onRetry?.();
    } catch (error) {
      console.error('[ActionRetryButton] Retry failed:', error);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleRetry}
      disabled={retrying}
      className="flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-600/50 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      title="Retry this action"
    >
      <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
      {retrying ? 'Retrying...' : 'Retry'}
    </motion.button>
  );
}
