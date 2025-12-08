/**
 * Chain Progress Indicator
 * Phase 1, Day 8: Agent Chains (Simple)
 */

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import type { ChainExecutionState } from '../../core/agents/chainExecutor';

interface ChainProgressIndicatorProps {
  state: ChainExecutionState;
  onCancel?: () => void;
}

export function ChainProgressIndicator({ state, onCancel }: ChainProgressIndicatorProps) {
  const { status, currentStep, totalSteps, progress, results, error } = state;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
          {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
          {status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
          {status === 'cancelled' && <Circle className="h-4 w-4 text-gray-400" />}
          <span className="text-sm font-medium text-white">
            {state.status === 'running' ? 'Executing Chain' : 
             state.status === 'completed' ? 'Chain Completed' :
             state.status === 'failed' ? 'Chain Failed' : 'Chain Cancelled'}
          </span>
        </div>
        {onCancel && status === 'running' && (
          <button
            onClick={onCancel}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400">Step Results</h4>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                  result.success
                    ? 'bg-green-500/10 text-green-300'
                    : 'bg-red-500/10 text-red-300'
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                <span className="flex-1 truncate">{result.stepId}</span>
                {result.error && (
                  <span className="text-[10px] opacity-75">{result.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

