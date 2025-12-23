/**
 * ActionLog Component - Shows what Regen understood and decided
 *
 * Displays:
 * - User intent parsing ("I said X, Regen understood Y")
 * - Decision made ("Why did it choose this action?")
 * - Context considered ("What information was used?")
 *
 * Builds trust by making AI reasoning visible
 *
 * UI/UX Fixes:
 * - Default-expanded for first 5 uses
 * - Linked to progress steps
 * - Enhanced confidence visualization
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Brain, Target, Zap, Link2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActionLogExpanded } from '../../hooks/useActionLogExpanded';

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  userSaid: string;
  regenUnderstood: {
    intent: string;
    confidence: number;
    alternatives?: string[];
  };
  decision: {
    action: string;
    reasoning: string;
    constraints: string[];
  };
  context: {
    sources: string[];
    lastMemory?: string;
    mode: string;
  };
  result?: {
    success: boolean;
    output?: string;
    error?: string;
  };
  // Link to job progress step
  linkedStep?: {
    jobId?: string;
    stepName: string;
    progress?: number;
  };
}

interface ActionLogProps {
  entries: ActionLogEntry[];
  isCollapsed?: boolean;
}

export function ActionLog({ entries, isCollapsed: _isCollapsed = false }: ActionLogProps) {
  const shouldDefaultExpand = useActionLogExpanded();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Default-expand first entry on first 5 uses
  useEffect(() => {
    if (shouldDefaultExpand && entries.length > 0 && expandedId === null) {
      setExpandedId(entries[0].id);
    }
  }, [shouldDefaultExpand, entries, expandedId]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 px-4 py-3 text-sm text-slate-400">
        No action history yet. Try a voice command to see Regen's reasoning.
      </div>
    );
  }

  const displayEntries = showAll ? entries : entries.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <Brain size={14} className="text-cyan-400" />
        Regen's Reasoning
        {shouldDefaultExpand && (
          <span className="ml-auto text-[10px] font-normal text-cyan-400/70">
            (Auto-expanded for first-time users)
          </span>
        )}
      </div>

      <AnimatePresence>
        {displayEntries.map(entry => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/50"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="w-full px-4 py-3 text-left transition-colors hover:bg-slate-700/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-200">{entry.userSaid}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    ↳ Regen understood:{' '}
                    <span className="text-cyan-300">{entry.regenUnderstood.intent}</span>
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: expandedId === entry.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} className="flex-shrink-0 text-slate-400" />
                </motion.div>
              </div>

              {/* Enhanced Confidence visualization (always visible) */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1.5">
                  <TrendingUp size={12} className="flex-shrink-0 text-cyan-400" />
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className={`h-full transition-all duration-300 ${
                        entry.regenUnderstood.confidence >= 0.8
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : entry.regenUnderstood.confidence >= 0.6
                            ? 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{
                        width: `${entry.regenUnderstood.confidence * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      entry.regenUnderstood.confidence >= 0.8
                        ? 'text-emerald-300'
                        : entry.regenUnderstood.confidence >= 0.6
                          ? 'text-cyan-300'
                          : 'text-amber-300'
                    }`}
                  >
                    {(entry.regenUnderstood.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                {/* Linked step indicator */}
                {entry.linkedStep && (
                  <div className="flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5">
                    <Link2 size={10} className="text-blue-400" />
                    <span className="text-xs text-blue-300">{entry.linkedStep.stepName}</span>
                  </div>
                )}
              </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {expandedId === entry.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-700/40 bg-slate-900/50"
                >
                  <div className="space-y-3 px-4 py-3">
                    {/* Understanding */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Target size={14} className="text-blue-400" />
                        <span className="text-xs font-semibold text-slate-300">Understanding</span>
                      </div>
                      <div className="ml-5 space-y-2 text-xs">
                        <p className="text-gray-300">
                          <span className="text-slate-400">Intent:</span>{' '}
                          {entry.regenUnderstood.intent}
                        </p>
                        {/* Enhanced confidence visualization */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Confidence</span>
                            <span
                              className={`text-xs font-semibold tabular-nums ${
                                entry.regenUnderstood.confidence >= 0.8
                                  ? 'text-emerald-300'
                                  : entry.regenUnderstood.confidence >= 0.6
                                    ? 'text-cyan-300'
                                    : 'text-amber-300'
                              }`}
                            >
                              {(entry.regenUnderstood.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative h-2 overflow-hidden rounded-full bg-slate-700">
                            <div
                              className={`h-full transition-all duration-300 ${
                                entry.regenUnderstood.confidence >= 0.8
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : entry.regenUnderstood.confidence >= 0.6
                                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                              }`}
                              style={{
                                width: `${entry.regenUnderstood.confidence * 100}%`,
                              }}
                            />
                            {/* Confidence threshold markers */}
                            <div className="pointer-events-none absolute inset-0 flex items-center">
                              <div className="ml-[60%] h-full w-px bg-slate-600" />
                              <div className="ml-[80%] h-full w-px bg-slate-600" />
                            </div>
                          </div>
                          {/* Confidence interpretation */}
                          <p className="text-[10px] text-slate-500">
                            {entry.regenUnderstood.confidence >= 0.8
                              ? 'Very confident'
                              : entry.regenUnderstood.confidence >= 0.6
                                ? 'Moderately confident'
                                : 'Low confidence - review recommended'}
                          </p>
                        </div>
                        {entry.regenUnderstood.alternatives &&
                          entry.regenUnderstood.alternatives.length > 0 && (
                            <p className="mt-2 text-slate-400">
                              Alternatives: {entry.regenUnderstood.alternatives.join(', ')}
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Decision */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Zap size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-slate-300">Decision</span>
                      </div>
                      <div className="ml-5 space-y-2 text-xs">
                        <p className="text-gray-300">
                          <span className="text-slate-400">Action:</span> {entry.decision.action}
                        </p>
                        <p className="text-slate-400">
                          <span className="text-slate-500">Why?</span> {entry.decision.reasoning}
                        </p>
                        {entry.decision.constraints.length > 0 && (
                          <p className="text-slate-400">
                            <span className="text-slate-500">Constraints:</span>{' '}
                            {entry.decision.constraints.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Context */}
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Brain size={14} className="text-purple-400" />
                        <span className="text-xs font-semibold text-slate-300">Context Used</span>
                      </div>
                      <div className="ml-5 space-y-1 text-xs">
                        <p className="text-slate-400">
                          <span className="text-slate-500">Mode:</span> {entry.context.mode}
                        </p>
                        {entry.context.lastMemory && (
                          <p className="text-slate-400">
                            <span className="text-slate-500">Memory:</span>{' '}
                            {entry.context.lastMemory}
                          </p>
                        )}
                        {entry.context.sources.length > 0 && (
                          <p className="text-slate-400">
                            <span className="text-slate-500">Sources:</span>{' '}
                            {entry.context.sources.join(', ')}
                          </p>
                        )}
                        {/* Linked step progress */}
                        {entry.linkedStep && (
                          <div className="mt-2 rounded border border-blue-500/30 bg-blue-500/10 p-2">
                            <div className="mb-1 flex items-center gap-2">
                              <Link2 size={12} className="text-blue-400" />
                              <span className="font-medium text-slate-300">Linked to step:</span>
                              <span className="text-blue-300">{entry.linkedStep.stepName}</span>
                            </div>
                            {entry.linkedStep.progress !== undefined && (
                              <div className="mt-1">
                                <div className="mb-0.5 flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400">Progress</span>
                                  <span className="text-[10px] tabular-nums text-blue-300">
                                    {entry.linkedStep.progress}%
                                  </span>
                                </div>
                                <div className="h-1 overflow-hidden rounded-full bg-slate-700">
                                  <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${entry.linkedStep.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Result */}
                    {entry.result && (
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
                              entry.result.success
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {entry.result.success ? '✓ Success' : '✗ Failed'}
                          </span>
                        </div>
                        {entry.result.output && (
                          <p className="ml-5 truncate text-xs text-slate-400">
                            {entry.result.output}
                          </p>
                        )}
                        {entry.result.error && (
                          <p className="ml-5 text-xs text-red-400">Error: {entry.result.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Show more button */}
      {!showAll && entries.length > 3 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-3 py-2 text-center text-xs text-slate-400 transition-colors hover:text-slate-200"
        >
          Show {entries.length - 3} more action{entries.length - 3 !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

/**
 * Memory Indicator - Shows what Regen remembers
 */
export function MemoryIndicator({
  lastMemory,
  confidence,
}: {
  lastMemory?: string;
  confidence?: number;
}) {
  if (!lastMemory) return null;

  return (
    <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-400" />
        <span className="text-xs font-semibold text-amber-200">Regen remembers:</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-amber-100/80">{lastMemory}</p>
      {confidence && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-amber-900">
          <div className="h-full bg-amber-400" style={{ width: `${confidence * 100}%` }} />
        </div>
      )}
    </div>
  );
}
