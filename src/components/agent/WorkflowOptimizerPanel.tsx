/**
 * Workflow Optimizer Panel
 * UI for reviewing and applying optimization suggestions
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  Merge, 
  ArrowDownUp, 
  Copy,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { useOptimizerStore, type OptimizationSuggestion } from '@/core/agent/optimizer';
import { useWorkflowStore } from '@/core/agent/workflows';

const IMPACT_COLORS = {
  high: 'text-red-400 bg-red-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  low: 'text-blue-400 bg-blue-400/10',
};

const TYPE_ICONS = {
  parallel_execution: Zap,
  timeout_adjustment: Clock,
  step_consolidation: Merge,
  step_reordering: ArrowDownUp,
  duplicate_removal: Copy,
};

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  onApply: () => void;
  onDismiss: () => void;
}

function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);

  const Icon = TYPE_ICONS[suggestion.type];

  const handleApply = async () => {
    setApplying(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
    onApply();
    setApplying(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="border border-gray-700 rounded-lg bg-gray-800/50 p-4 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${IMPACT_COLORS[suggestion.impact]}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">
                {suggestion.description}
              </h4>
              <p className="text-sm text-gray-400">
                {suggestion.templateName}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${IMPACT_COLORS[suggestion.impact]}`}>
                {suggestion.impact.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span>{suggestion.estimatedImprovement}</span>
            </div>
            {suggestion.autoApplicable && (
              <div className="flex items-center gap-1 text-blue-400">
                <Sparkles className="w-4 h-4" />
                <span>Auto-applicable</span>
              </div>
            )}
          </div>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gray-700"
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-2 flex items-center gap-1">
                    <X className="w-3 h-3" /> Before
                  </p>
                  <div className="bg-gray-900 rounded p-2 space-y-1">
                    {suggestion.changes.before.map((step, i) => (
                      <div key={i} className="text-gray-300 text-xs truncate">
                        {step.content || `Step ${i + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-2 flex items-center gap-1">
                    <Check className="w-3 h-3" /> After
                  </p>
                  <div className="bg-gray-900 rounded p-2 space-y-1">
                    {suggestion.changes.after.map((step, i) => (
                      <div key={i} className="text-green-400 text-xs truncate">
                        {step.content || `Optimized ${i + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleApply}
              disabled={applying || !!suggestion.appliedAt}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                suggestion.appliedAt
                  ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                  : applying
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {applying ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                  Applying...
                </>
              ) : suggestion.appliedAt ? (
                <>
                  <Check className="w-4 h-4" />
                  Applied
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Apply
                </>
              )}
            </button>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Details
                </>
              )}
            </button>

            {!suggestion.appliedAt && (
              <button
                onClick={onDismiss}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <X className="w-4 h-4" />
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function WorkflowOptimizerPanel() {
  const { suggestions, applySuggestion, dismissSuggestion, history } = useOptimizerStore();
  const _workflowStore = useWorkflowStore();
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredSuggestions = useMemo(() => {
    const active = suggestions.filter(s => !s.appliedAt);
    if (filter === 'all') return active;
    return active.filter(s => s.impact === filter);
  }, [suggestions, filter]);

  const stats = useMemo(() => {
    const active = suggestions.filter(s => !s.appliedAt);
    return {
      total: active.length,
      high: active.filter(s => s.impact === 'high').length,
      medium: active.filter(s => s.impact === 'medium').length,
      low: active.filter(s => s.impact === 'low').length,
      applied: suggestions.filter(s => s.appliedAt).length,
    };
  }, [suggestions]);

  const handleApply = (suggestionId: string) => {
    applySuggestion(suggestionId);
  };

  const handleDismiss = (suggestionId: string) => {
    dismissSuggestion(suggestionId);
  };

  const handleApplyAll = () => {
    const autoApplicable = filteredSuggestions.filter(s => s.autoApplicable && !s.appliedAt);
    autoApplicable.forEach(s => applySuggestion(s.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Workflow Optimizations
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            AI-powered suggestions to improve workflow performance
          </p>
        </div>

        {stats.total > 0 && (
          <button
            onClick={handleApplyAll}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Apply All Safe Optimizations
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'all'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Suggestions</div>
        </button>

        <button
          onClick={() => setFilter('high')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'high'
              ? 'border-red-500 bg-red-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="text-2xl font-bold text-red-400">{stats.high}</div>
          <div className="text-sm text-gray-400">High Impact</div>
        </button>

        <button
          onClick={() => setFilter('medium')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'medium'
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="text-2xl font-bold text-yellow-400">{stats.medium}</div>
          <div className="text-sm text-gray-400">Medium Impact</div>
        </button>

        <button
          onClick={() => setFilter('low')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'low'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="text-2xl font-bold text-blue-400">{stats.low}</div>
          <div className="text-sm text-gray-400">Low Impact</div>
        </button>

        <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
          <div className="text-2xl font-bold text-green-400">{stats.applied}</div>
          <div className="text-sm text-gray-400">Applied</div>
        </div>
      </div>

      {/* Suggestions List */}
      <div>
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-700 rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {stats.total === 0
                ? 'No optimization suggestions yet. Run analytics on your workflows to generate insights.'
                : 'No suggestions match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredSuggestions.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={() => handleApply(suggestion.id)}
                  onDismiss={() => handleDismiss(suggestion.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* History Summary */}
      {history.length > 0 && (
        <div className="pt-6 border-t border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3">Recent Optimizations</h3>
          <div className="space-y-2">
            {history.slice(-5).reverse().map((result, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 text-sm"
              >
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="flex-1 text-gray-300">
                  {result.changes[0]}
                </div>
                <span className="text-gray-500 text-xs">Just now</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
