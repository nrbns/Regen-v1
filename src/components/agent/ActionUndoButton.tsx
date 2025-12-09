/**
 * Action Undo Button - Allows undoing the last action
 */

import { Undo2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { actionUndoManager } from '../../services/actionUndo';
import { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';

export function ActionUndoButton() {
  const [undoing, setUndoing] = useState(false);
  const [hasUndoable, setHasUndoable] = useState(false);

  // Check if there's an undoable action
  useEffect(() => {
    const checkUndoable = () => {
      const lastAction = actionUndoManager.getLastAction();
      setHasUndoable(lastAction !== null);
    };

    checkUndoable();
    // Check periodically
    const interval = setInterval(checkUndoable, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUndo = async () => {
    if (undoing || !hasUndoable) return;

    setUndoing(true);
    try {
      const success = await actionUndoManager.undoLast();
      if (success) {
        toast.success('Action undone');
        setHasUndoable(false);
      } else {
        toast.error('Failed to undo action');
      }
    } catch (error) {
      console.error('[ActionUndoButton] Undo failed:', error);
      toast.error('Failed to undo action');
    } finally {
      setUndoing(false);
    }
  };

  if (!hasUndoable) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleUndo}
      disabled={undoing}
      className="flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-600/50 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      title="Undo last action"
    >
      <Undo2 className={`h-3.5 w-3.5 ${undoing ? 'animate-spin' : ''}`} />
      {undoing ? 'Undoing...' : 'Undo'}
    </motion.button>
  );
}
