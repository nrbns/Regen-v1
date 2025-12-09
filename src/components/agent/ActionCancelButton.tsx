/**
 * Action Cancel Button - Allows cancelling running actions
 */

import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoiceControlStore } from '../../state/agentStreamStore';

interface ActionCancelButtonProps {
  action: string;
  onCancel?: () => void;
}

export function ActionCancelButton({ action, onCancel }: ActionCancelButtonProps) {
  const { cancelAction, setActionProgress, setActionResults, actionResults, actions } =
    useVoiceControlStore();

  const handleCancel = () => {
    cancelAction(action);
    setActionProgress(action, {
      action,
      status: 'cancelled',
      message: 'Cancelled by user',
    });

    // Update result to show cancelled
    const actionIndex = actions.indexOf(action);
    if (actionIndex >= 0) {
      const newResults = [...actionResults];
      if (newResults[actionIndex]) {
        newResults[actionIndex] = {
          ...newResults[actionIndex],
          success: false,
          error: 'Cancelled by user',
          retryable: true,
        };
      } else {
        newResults[actionIndex] = {
          success: false,
          action,
          error: 'Cancelled by user',
          retryable: true,
        };
      }
      setActionResults(newResults);
    }

    onCancel?.();
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleCancel}
      className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/30 hover:text-red-200"
      title="Cancel this action"
    >
      <X className="h-3 w-3" />
      Cancel
    </motion.button>
  );
}
