/**
 * Agent Card Component
 * Clean card display for agents with status indicators and actions
 */

import { useState } from 'react';
import {
  Bot,
  Play,
  Pause,
  Square,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
// import { motion } from 'framer-motion'; // Unused
import { cn } from '../../lib/utils';
import { ResponsiveCard } from '../common/ResponsiveCard';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused' | 'cancelled';

export interface AgentCardProps {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  progress?: number; // 0-100
  steps?: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    duration?: number;
  }>;
  result?: {
    type: 'success' | 'error' | 'partial';
    message: string;
    data?: unknown;
  };
  onRun?: () => void;
  onPause?: () => void;
  onCancel?: () => void;
  onViewResult?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

const STATUS_CONFIG: Record<
  AgentStatus,
  {
    color: string;
    bgColor: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  idle: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-800/50',
    icon: <Bot size={16} />,
    label: 'Idle',
  },
  running: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    icon: <Loader2 size={16} className="animate-spin" />,
    label: 'Running',
  },
  paused: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    icon: <Pause size={16} />,
    label: 'Paused',
  },
  completed: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    icon: <CheckCircle2 size={16} />,
    label: 'Completed',
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    icon: <XCircle size={16} />,
    label: 'Error',
  },
  cancelled: {
    color: 'text-slate-500',
    bgColor: 'bg-slate-800/50',
    icon: <Square size={16} />,
    label: 'Cancelled',
  },
};

export function AgentCard({
  id: _id,
  name,
  description,
  status,
  progress,
  steps,
  result,
  onRun,
  onPause,
  onCancel,
  onViewResult,
  icon,
  className,
}: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <ResponsiveCard
      className={cn(
        'transition-all duration-200',
        status === 'running' && 'ring-2 ring-blue-500/30',
        status === 'completed' && 'ring-1 ring-emerald-500/30',
        status === 'error' && 'ring-1 ring-red-500/30',
        className
      )}
      padding="md"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* Icon */}
          <div className={cn('flex-shrink-0 rounded-lg p-2', config.bgColor)}>
            {icon || config.icon}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">{name}</h3>
              <span
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
                  config.color,
                  config.bgColor
                )}
              >
                {config.icon}
                {config.label}
              </span>
            </div>
            {description && <p className="line-clamp-2 text-sm text-slate-400">{description}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {status === 'idle' && onRun && (
            <button
              onClick={onRun}
              className="rounded-lg bg-purple-600 p-2 text-white transition-colors hover:bg-purple-700"
              aria-label="Run agent"
            >
              <Play size={16} />
            </button>
          )}
          {status === 'running' && (
            <>
              {onPause && (
                <button
                  onClick={onPause}
                  className="rounded-lg bg-amber-600 p-2 text-white transition-colors hover:bg-amber-700"
                  aria-label="Pause agent"
                >
                  <Pause size={16} />
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
                  aria-label="Cancel agent"
                >
                  <Square size={16} />
                </button>
              )}
            </>
          )}
          {status === 'completed' && onViewResult && (
            <button
              onClick={onViewResult}
              className="rounded-lg bg-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-600"
              aria-label="View result"
            >
              <Sparkles size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'running' && progress !== undefined && (
        <div className="mb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">{progress.toFixed(0)}% complete</p>
        </div>
      )}

      {/* Steps */}
      {steps && steps.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
          >
            {expanded ? 'Hide' : 'Show'} steps ({steps.length})
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="flex items-center gap-2 rounded bg-slate-800/50 p-2"
                >
                  <div className="flex-shrink-0">
                    {step.status === 'completed' && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    {step.status === 'running' && (
                      <Loader2 size={14} className="animate-spin text-blue-400" />
                    )}
                    {step.status === 'pending' && <Clock size={14} className="text-slate-500" />}
                    {step.status === 'error' && <XCircle size={14} className="text-red-400" />}
                  </div>
                  <span className="flex-1 text-xs text-slate-300">{step.name}</span>
                  {step.duration !== undefined && (
                    <span className="text-xs text-slate-500">{step.duration}ms</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result Preview */}
      {result && status === 'completed' && (
        <div
          className={cn(
            'rounded-lg border p-3',
            result.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : result.type === 'error'
                ? 'border-red-500/20 bg-red-500/10'
                : 'border-amber-500/20 bg-amber-500/10'
          )}
        >
          <div className="flex items-start gap-2">
            {result.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400" />}
            {result.type === 'error' && <XCircle size={16} className="text-red-400" />}
            {result.type === 'partial' && <AlertTriangle size={16} className="text-amber-400" />}
            <p className="flex-1 text-sm text-slate-300">{result.message}</p>
          </div>
        </div>
      )}
    </ResponsiveCard>
  );
}
