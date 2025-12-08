/**
 * Agent Execution Display Component
 * Shows step-by-step progress, results, and cancel functionality
 */

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  X,
  Copy,
  Download,
  // ExternalLink, // Unused
} from 'lucide-react';
// import { motion } from 'framer-motion'; // Unused
import { cn } from '../../lib/utils';

export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

export interface ExecutionStep {
  id: string;
  name: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: string;
  result?: unknown;
  logs?: string[];
}

export interface AgentExecutionDisplayProps {
  agentName: string;
  query: string;
  steps: ExecutionStep[];
  overallProgress?: number; // 0-100
  result?: {
    type: 'success' | 'error' | 'partial';
    data?: unknown;
    message?: string;
  };
  onCancel?: () => void;
  onDismiss?: () => void;
  onExport?: () => void;
  className?: string;
}

export function AgentExecutionDisplay({
  agentName,
  query,
  steps,
  overallProgress,
  result,
  onCancel,
  onDismiss,
  onExport,
  className,
}: AgentExecutionDisplayProps) {
  const [selectedStep, _setSelectedStep] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runningStep = steps.find(s => s.status === 'running');
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const currentProgress =
    overallProgress !== undefined
      ? overallProgress
      : totalSteps > 0
      ? (completedSteps / totalSteps) * 100
      : 0;

  const handleCopyResult = async () => {
    if (result?.data) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const getStepIcon = (step: ExecutionStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 size={18} className="text-emerald-400" />;
      case 'running':
        return <Loader2 size={18} className="text-blue-400 animate-spin" />;
      case 'error':
        return <XCircle size={18} className="text-red-400" />;
      case 'skipped':
        return <Clock size={18} className="text-slate-500" />;
      default:
        return <Clock size={18} className="text-slate-600" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={cn('bg-slate-900 rounded-lg border border-slate-800 p-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{agentName}</h3>
          <p className="text-sm text-slate-400 line-clamp-2">{query}</p>
        </div>
        <div className="flex items-center gap-2">
          {onExport && result && (
            <button
              onClick={onExport}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Export result"
            >
              <Download size={16} />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      {currentProgress > 0 && currentProgress < 100 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Overall Progress</span>
            <span className="text-sm text-slate-400">{currentProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${currentProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-2 mb-4">
        {steps.map((step, idx) => (
          <motion.div
            key={step.id || idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              'p-3 rounded-lg border transition-colors',
              step.status === 'running'
                ? 'bg-blue-500/10 border-blue-500/30'
                : step.status === 'completed'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : step.status === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-800/50 border-slate-700'
            )}
          >
            <div className="flex items-center gap-3">
              {getStepIcon(step)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{step.name}</p>
                  {step.duration && (
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </div>
                {step.error && (
                  <p className="text-xs text-red-400 mt-1">{step.error}</p>
                )}
              </div>
            </div>

            {/* Step Details */}
            {selectedStep === step.id && step.logs && step.logs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <div className="text-xs text-slate-400 space-y-1">
                  {step.logs.map((log, logIdx) => (
                    <p key={logIdx}>{log}</p>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'p-4 rounded-lg border',
            result.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : result.type === 'error'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          )}
        >
          <div className="flex items-start gap-3 mb-3">
            {result.type === 'success' && (
              <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
            )}
            {result.type === 'error' && (
              <XCircle size={20} className="text-red-400 flex-shrink-0" />
            )}
            {result.type === 'partial' && (
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white mb-1">
                {result.type === 'success'
                  ? 'Execution Completed'
                  : result.type === 'error'
                  ? 'Execution Failed'
                  : 'Partial Results'}
              </h4>
              {result.message && (
                <p className="text-sm text-slate-300">{result.message}</p>
              )}
            </div>
          </div>

          {/* Result Data */}
          {result.data != null && (
            <div className="mt-3 p-3 bg-slate-950 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Result Data</span>
                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs text-slate-300 overflow-x-auto">
                {typeof result.data === 'string'
                  ? result.data
                  : JSON.stringify(result.data as any, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      )}

      {/* Cancel Button */}
      {runningStep && onCancel && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} />
            Cancel Execution
          </button>
        </div>
      )}
    </div>
  );
}


