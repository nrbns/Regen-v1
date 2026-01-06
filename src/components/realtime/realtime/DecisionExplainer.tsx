/**
 * DecisionExplainer - Shows WHY Regen suggested something
 * 
 * Used in:
 * - Research Mode: "Why this source?"
 * - Trade Mode: "Why this signal?"
 * - Code Mode: "Why this approach?"
 * 
 * Builds trust through transparency
 */

import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

export interface DecisionExplanation {
  mainReason: string;
  supportingReasons: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  alternativesConsidered?: string[];
  warning?: string;
}

interface DecisionExplainerProps {
  explanation: DecisionExplanation;
  compact?: boolean;
}

export function DecisionExplainer({ explanation, compact = false }: DecisionExplainerProps) {
  const confidenceColor = {
    low: 'bg-amber-500/20 text-amber-200 border-amber-600/40',
    medium: 'bg-blue-500/20 text-blue-200 border-blue-600/40',
    high: 'bg-emerald-500/20 text-emerald-200 border-emerald-600/40',
  };

  const confidenceLabel = {
    low: 'Low confidence',
    medium: 'Medium confidence',
    high: 'High confidence',
  };

  if (compact) {
    return (
      <div className={`rounded border ${confidenceColor[explanation.confidenceLevel]} px-3 py-2`}>
        <p className="text-xs font-medium mb-1">
          <HelpCircle className="inline mr-1 w-3 h-3" />
          {explanation.mainReason}
        </p>
        <div className="h-1 bg-white/10 rounded overflow-hidden">
          <div
            className={`h-full ${
              explanation.confidenceLevel === 'high'
                ? 'bg-emerald-500'
                : explanation.confidenceLevel === 'medium'
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
            }`}
            style={{
              width: `${
                explanation.confidenceLevel === 'high'
                  ? 80
                  : explanation.confidenceLevel === 'medium'
                    ? 60
                    : 40
              }%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-700/40 bg-slate-800/30 p-4">
      {/* Main reason */}
      <div>
        <div className="flex items-start gap-2 mb-2">
          <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-100">
              {explanation.mainReason}
            </p>
            <div className={`mt-2 inline-flex px-2 py-1 rounded text-xs font-medium border ${confidenceColor[explanation.confidenceLevel]}`}>
              {confidenceLabel[explanation.confidenceLevel]}
            </div>
          </div>
        </div>
      </div>

      {/* Supporting reasons */}
      {explanation.supportingReasons.length > 0 && (
        <div className="space-y-1 pl-6 border-l border-slate-700/40">
          <p className="text-xs font-medium text-slate-400">Supporting reasons:</p>
          {explanation.supportingReasons.map((reason, idx) => (
            <p key={idx} className="text-xs text-slate-300">
              • {reason}
            </p>
          ))}
        </div>
      )}

      {/* Alternatives considered */}
      {explanation.alternativesConsidered && explanation.alternativesConsidered.length > 0 && (
        <div className="space-y-1 pl-6 border-l border-slate-700/40">
          <p className="text-xs font-medium text-slate-400">Alternatives considered:</p>
          {explanation.alternativesConsidered.map((alt, idx) => (
            <p key={idx} className="text-xs text-slate-400">
              ○ {alt}
            </p>
          ))}
        </div>
      )}

      {/* Warning if present */}
      {explanation.warning && (
        <div className="rounded border border-amber-600/40 bg-amber-900/20 p-2">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">{explanation.warning}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example decision explanations for common scenarios
 */
export const EXAMPLE_EXPLANATIONS = {
  research: {
    mainReason: 'Selected this source because it has high authority and recent data',
    supportingReasons: [
      'Domain established 2015, thousands of citations',
      'Last updated within 24 hours',
      'Aligns with 3+ other credible sources',
    ],
    confidenceLevel: 'high' as const,
    alternativesConsidered: ['Wikipedia (too general)', 'Blog (limited authority)'],
  },

  trade: {
    mainReason: 'BUY signal: Technical reversal at support level + volume increase',
    supportingReasons: [
      'Price at 200-day MA (strong support)',
      'Volume 150% above average',
      'RSI at 30 (oversold territory)',
      'Earnings in 5 days (catalyst)',
    ],
    confidenceLevel: 'medium' as const,
    alternativesConsidered: ['HOLD (wait for confirmation)', 'SELL (macro headwinds)'],
    warning: 'Market conditions volatile. Consider tighter stop loss.',
  },

  code: {
    mainReason: 'Recommended React hooks pattern over class component',
    supportingReasons: [
      'Smaller bundle size (hooks < class)',
      'Easier state management with useState',
      'Better code reusability',
      'Your codebase uses hooks elsewhere',
    ],
    confidenceLevel: 'high' as const,
    alternativesConsidered: ['Class component (legacy pattern)', 'Vue (different framework)'],
  },
};
