/**
 * Quick Facts Panel Component
 * Structured data display for search queries with visual formatting
 */

import { Sparkles, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ResponsiveCard } from '../common/ResponsiveCard';

export interface QuickFact {
  label: string;
  value: string | number;
  type?: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'boolean';
  source?: string;
  verified?: boolean;
  trend?: 'up' | 'down' | 'stable';
}

export interface QuickFactsPanelProps {
  facts: QuickFact[];
  title?: string;
  source?: string;
  className?: string;
}

export function QuickFactsPanel({
  facts,
  title = 'Quick Facts',
  source,
  className,
}: QuickFactsPanelProps) {
  const formatValue = (fact: QuickFact): string => {
    switch (fact.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(Number(fact.value));
      case 'percentage':
        return `${fact.value}%`;
      case 'date':
        return new Date(fact.value as string).toLocaleDateString();
      case 'boolean':
        return fact.value ? 'Yes' : 'No';
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(fact.value));
      default:
        return String(fact.value);
    }
  };

  if (facts.length === 0) {
    return null;
  }

  return (
    <ResponsiveCard
      className={cn(
        'border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-blue-500/10',
        className
      )}
      padding="md"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      {/* Facts Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {facts.map((fact, idx) => (
          <div
            key={idx}
            className={cn(
              'rounded-lg border p-3',
              fact.verified !== false
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-slate-700 bg-slate-800/50'
            )}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {fact.label}
              </span>
              <div className="flex items-center gap-1">
                {fact.verified !== false && <CheckCircle2 size={14} className="text-emerald-400" />}
                {fact.trend === 'up' && <TrendingUp size={14} className="text-emerald-400" />}
                {fact.trend === 'down' && (
                  <TrendingUp size={14} className="rotate-180 text-red-400" />
                )}
              </div>
            </div>
            <p className="text-lg font-semibold text-white">{formatValue(fact)}</p>
            {fact.source && <p className="mt-1 text-xs text-slate-500">Source: {fact.source}</p>}
          </div>
        ))}
      </div>

      {/* Source Attribution */}
      {source && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <Info size={14} />
          <span>Data from {source}</span>
        </div>
      )}
    </ResponsiveCard>
  );
}
