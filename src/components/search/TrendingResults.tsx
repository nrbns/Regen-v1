/**
 * Trending Results Component
 * Displays popular/trending search results and queries
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Flame, Clock, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ResponsiveCard } from '../common/ResponsiveCard';

export interface TrendingResult {
  query: string;
  count: number;
  category?: string;
  change?: 'up' | 'down';
  changePercent?: number;
}

export interface TrendingResultsProps {
  results?: TrendingResult[];
  title?: string;
  maxItems?: number;
  onSelect?: (query: string) => void;
  className?: string;
}

export function TrendingResults({
  results,
  title = 'Trending Searches',
  maxItems = 5,
  onSelect,
  className,
}: TrendingResultsProps) {
  const [trendingData, setTrendingData] = useState<TrendingResult[]>([]);
  const [loading, setLoading] = useState(!results);

  useEffect(() => {
    if (results) {
      setTrendingData(results.slice(0, maxItems));
      setLoading(false);
    } else {
      // Fetch trending searches from API
      fetchTrendingSearches();
    }
  }, [results, maxItems]);

  const fetchTrendingSearches = async () => {
    try {
      setLoading(true);
      // In production, this would call your backend API
      const response = await fetch('/api/trending');
      if (response.ok) {
        const data = await response.json();
        setTrendingData(data.slice(0, maxItems));
      }
    } catch (error) {
      console.error('Failed to fetch trending searches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || trendingData.length === 0) {
    return null;
  }

  return (
    <ResponsiveCard
      className={cn(
        'border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-500/10',
        className
      )}
      padding="md"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-orange-400" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <Clock size={16} className="text-slate-400" />
      </div>

      {/* Trending List */}
      <div className="space-y-2">
        {trendingData.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect?.(item.query)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-all',
              'border-slate-700 bg-slate-800/50 hover:border-orange-500/50 hover:bg-slate-800',
              'group flex items-center justify-between gap-3'
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  idx === 0
                    ? 'bg-orange-500/20 text-orange-300'
                    : idx === 1
                      ? 'bg-red-500/20 text-red-300'
                      : idx === 2
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-slate-700 text-slate-400'
                )}
              >
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white transition-colors group-hover:text-orange-300">
                  {item.query}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {item.category && <span className="text-xs text-slate-500">{item.category}</span>}
                  {item.change === 'up' && item.changePercent && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <TrendingUp size={12} />+{item.changePercent}%
                    </span>
                  )}
                  {item.change === 'down' && item.changePercent && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <TrendingUp size={12} className="rotate-180" />
                      {item.changePercent}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ArrowRight
              size={16}
              className="flex-shrink-0 text-slate-400 transition-colors group-hover:text-orange-400"
            />
          </button>
        ))}
      </div>
    </ResponsiveCard>
  );
}
