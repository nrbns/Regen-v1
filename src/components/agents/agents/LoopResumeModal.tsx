/**
 * Loop Resume Modal
 * Shows crashed loops and offers to resume them
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Play } from 'lucide-react';
import {
  checkForCrashedLoops,
  resumeLoop,
  deleteLoopState,
  type LoopState,
} from '../../core/agents/loopResume';
import { toast } from 'react-hot-toast';

interface LoopResumeModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoopResumeModal({ open, onClose }: LoopResumeModalProps) {
  const [crashedLoops, setCrashedLoops] = useState<LoopState[]>([]);
  // const { setRun, setStatus } = useAgentStreamStore(); // Reserved for future use

  useEffect(() => {
    if (open) {
      const loops = checkForCrashedLoops();
      setCrashedLoops(loops);
    }
  }, [open]);

  const handleResume = (loop: LoopState) => {
    const success = resumeLoop(loop.runId);
    if (success) {
      toast.success(`Resumed loop: ${loop.goal.slice(0, 50)}...`);
      onClose();
    } else {
      toast.error('Failed to resume loop');
    }
  };

  const handleDelete = (runId: string) => {
    deleteLoopState(runId);
    setCrashedLoops(prev => prev.filter(l => l.runId !== runId));
    toast.success('Deleted crashed loop');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gray-800 bg-[#1A1D28] shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-yellow-400" />
              <h2 className="text-lg font-semibold text-gray-100">
                Crashed Loops ({crashedLoops.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {crashedLoops.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <p>No crashed loops found.</p>
                <p className="mt-2 text-sm">All loops completed successfully.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crashedLoops.map(loop => (
                  <div
                    key={loop.runId}
                    className="rounded-lg border border-gray-800/50 bg-gray-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400">
                            {loop.runId.slice(0, 8)}...
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              loop.status === 'live'
                                ? 'bg-green-900/30 text-green-400'
                                : loop.status === 'error'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'bg-yellow-900/30 text-yellow-400'
                            }`}
                          >
                            {loop.status}
                          </span>
                          {loop.mode && <span className="text-xs text-gray-500">{loop.mode}</span>}
                        </div>
                        <h3 className="mb-1 truncate font-medium text-gray-200">
                          {loop.goal || 'Untitled loop'}
                        </h3>
                        {loop.transcript && (
                          <p className="mb-2 line-clamp-2 text-xs text-gray-400">
                            {loop.transcript.slice(0, 150)}...
                          </p>
                        )}
                        <div className="text-xs text-gray-500">
                          {loop.events.length} events • Last saved{' '}
                          {new Date(loop.lastSaved).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResume(loop)}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-blue-700"
                        >
                          <Play size={14} />
                          Resume
                        </button>
                        <button
                          onClick={() => handleDelete(loop.runId)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-red-400"
                          title="Delete"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-800 p-4">
            <p className="text-xs text-gray-400">
              Loops are auto-saved every 5 seconds. Resume to continue where you left off.
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
