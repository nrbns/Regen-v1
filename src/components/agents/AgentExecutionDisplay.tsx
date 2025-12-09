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
import { motion } from 'framer-motion';
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
        return <Loader2 size={18} className="animate-spin text-blue-400" />;
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
    <div className={cn('rounded-lg border border-slate-800 bg-slate-900 p-6', className)}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-semibold text-white">{agentName}</h3>
          <p className="line-clamp-2 text-sm text-slate-400">{query}</p>
        </div>
        <div className="flex items-center gap-2">
          {onExport && result && (
            <button
              onClick={onExport}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
              aria-label="Export result"
            >
              <Download size={16} />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
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
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-400">Overall Progress</span>
            <span className="text-sm text-slate-400">{currentProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
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
      <div className="mb-4 space-y-2">
        {steps.map((step, idx) => (
          <motion.div
            key={step.id || idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              step.status === 'running'
                ? 'border-blue-500/30 bg-blue-500/10'
                : step.status === 'completed'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : step.status === 'error'
                    ? 'border-red-500/30 bg-red-500/10'
                    : 'border-slate-700 bg-slate-800/50'
            )}
          >
            <div className="flex items-center gap-3">
              {getStepIcon(step)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{step.name}</p>
                  {step.duration && (
                    <span className="flex-shrink-0 text-xs text-slate-500">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </div>
                {step.error && <p className="mt-1 text-xs text-red-400">{step.error}</p>}
              </div>
            </div>

            {/* Step Details */}
            {selectedStep === step.id && step.logs && step.logs.length > 0 && (
              <div className="mt-2 border-t border-slate-700 pt-2">
                <div className="space-y-1 text-xs text-slate-400">
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
            'rounded-lg border p-4',
            result.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : result.type === 'error'
                ? 'border-red-500/20 bg-red-500/10'
                : 'border-amber-500/20 bg-amber-500/10'
          )}
        >
          <div className="mb-3 flex items-start gap-3">
            {result.type === 'success' && (
              <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-400" />
            )}
            {result.type === 'error' && (
              <XCircle size={20} className="flex-shrink-0 text-red-400" />
            )}
            {result.type === 'partial' && (
              <AlertTriangle size={20} className="flex-shrink-0 text-amber-400" />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="mb-1 text-sm font-semibold text-white">
                {result.type === 'success'
                  ? 'Execution Completed'
                  : result.type === 'error'
                    ? 'Execution Failed'
                    : 'Partial Results'}
              </h4>
              {result.message && <p className="text-sm text-slate-300">{result.message}</p>}
            </div>
          </div>

          {/* Result Data */}
          {result.data != null && (
            <div className="mt-3 rounded border border-slate-800 bg-slate-950 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">Result Data</span>
                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 transition-colors hover:text-white"
                >
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto text-xs text-slate-300">
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
        <div className="mt-4 border-t border-slate-800 pt-4">
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            <X size={16} />
            Cancel Execution
          </button>
        </div>
      )}
    </div>
  );
}
