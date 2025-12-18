/**
 * ActionLog Component - Shows what Regen understood and decided
 * 
 * Displays:
 * - User intent parsing ("I said X, Regen understood Y")
 * - Decision made ("Why did it choose this action?")
 * - Context considered ("What information was used?")
 * 
 * Builds trust by making AI reasoning visible
 */

import { useState } from 'react';
import { ChevronDown, Brain, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
}

interface ActionLogProps {
  entries: ActionLogEntry[];
  isCollapsed?: boolean;
}

export function ActionLog({ entries, isCollapsed: _isCollapsed = false }: ActionLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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
      <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
        <Brain size={14} className="text-cyan-400" />
        Regen's Reasoning
      </div>

      <AnimatePresence>
        {displayEntries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() =>
                setExpandedId(expandedId === entry.id ? null : entry.id)
              }
              className="w-full px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {entry.userSaid}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    ↳ Regen understood: <span className="text-cyan-300">{entry.regenUnderstood.intent}</span>
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: expandedId === entry.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                </motion.div>
              </div>

              {/* Confidence badge */}
              {expandedId !== entry.id && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                      style={{
                        width: `${entry.regenUnderstood.confidence * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {(entry.regenUnderstood.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
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
                  <div className="px-4 py-3 space-y-3">
                    {/* Understanding */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={14} className="text-blue-400" />
                        <span className="text-xs font-semibold text-slate-300">
                          Understanding
                        </span>
                      </div>
                      <div className="ml-5 text-xs space-y-1">
                        <p className="text-gray-300">
                          <span className="text-slate-400">Intent:</span> {entry.regenUnderstood.intent}
                        </p>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                            style={{
                              width: `${entry.regenUnderstood.confidence * 100}%`,
                            }}
                          />
                        </div>
                        <p className="text-slate-400">
                          Confidence: {(entry.regenUnderstood.confidence * 100).toFixed(1)}%
                        </p>
                        {entry.regenUnderstood.alternatives && entry.regenUnderstood.alternatives.length > 0 && (
                          <p className="text-slate-400 mt-2">
                            Alternatives: {entry.regenUnderstood.alternatives.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Decision */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-slate-300">
                          Decision
                        </span>
                      </div>
                      <div className="ml-5 text-xs space-y-2">
                        <p className="text-gray-300">
                          <span className="text-slate-400">Action:</span> {entry.decision.action}
                        </p>
                        <p className="text-slate-400">
                          <span className="text-slate-500">Why?</span> {entry.decision.reasoning}
                        </p>
                        {entry.decision.constraints.length > 0 && (
                          <p className="text-slate-400">
                            <span className="text-slate-500">Constraints:</span> {entry.decision.constraints.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Context */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Brain size={14} className="text-purple-400" />
                        <span className="text-xs font-semibold text-slate-300">
                          Context Used
                        </span>
                      </div>
                      <div className="ml-5 text-xs space-y-1">
                        <p className="text-slate-400">
                          <span className="text-slate-500">Mode:</span> {entry.context.mode}
                        </p>
                        {entry.context.lastMemory && (
                          <p className="text-slate-400">
                            <span className="text-slate-500">Memory:</span> {entry.context.lastMemory}
                          </p>
                        )}
                        {entry.context.sources.length > 0 && (
                          <p className="text-slate-400">
                            <span className="text-slate-500">Sources:</span> {entry.context.sources.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Result */}
                    {entry.result && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                            entry.result.success
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {entry.result.success ? '✓ Success' : '✗ Failed'}
                          </span>
                        </div>
                        {entry.result.output && (
                          <p className="ml-5 text-xs text-slate-400 truncate">
                            {entry.result.output}
                          </p>
                        )}
                        {entry.result.error && (
                          <p className="ml-5 text-xs text-red-400">
                            Error: {entry.result.error}
                          </p>
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
          className="w-full text-center px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
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
export function MemoryIndicator({ lastMemory, confidence }: { lastMemory?: string; confidence?: number }) {
  if (!lastMemory) return null;

  return (
    <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-semibold text-amber-200">Regen remembers:</span>
      </div>
      <p className="text-xs text-amber-100/80 mt-1 line-clamp-2">
        {lastMemory}
      </p>
      {confidence && (
        <div className="mt-1 h-1 bg-amber-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400"
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
