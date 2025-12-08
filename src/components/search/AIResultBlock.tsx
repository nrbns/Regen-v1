/**
 * AI Result Block Component
 * Premium search result display with AI-generated summaries, citations, and quick facts
 */

import { useState } from 'react';
import { Sparkles, ExternalLink, BookOpen, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ResponsiveCard } from '../common/ResponsiveCard';

export interface AIResultBlockProps {
  title: string;
  url: string;
  snippet: string;
  summary?: string;
  bullets?: string[];
  citations?: Array<{ title: string; url: string }>;
  source?: string;
  score?: number;
  publishedDate?: string;
  readTime?: number;
  onOpen?: (url: string) => void;
  onSave?: () => void;
  trending?: boolean;
  className?: string;
}

export function AIResultBlock({
  title,
  url,
  snippet,
  summary,
  bullets,
  citations,
  source,
  score,
  publishedDate,
  readTime,
  onOpen,
  onSave,
  trending = false,
  className,
}: AIResultBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleOpen = () => {
    if (onOpen) {
      onOpen(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <ResponsiveCard
      className={cn(
        'group transition-all duration-200',
        hovered && 'shadow-lg shadow-purple-500/10 border-purple-500/30',
        trending && 'border-emerald-500/30 bg-emerald-500/5',
        className
      )}
      hoverable
      padding="md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {trending && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs font-medium">
                <TrendingUp size={12} />
                Trending
              </span>
            )}
            {source && (
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs font-medium">
                {source}
              </span>
            )}
            {score !== undefined && (
              <span className="text-xs text-slate-500">{(score * 100).toFixed(0)}% match</span>
            )}
          </div>
          <h3
            className="text-lg font-semibold text-white mb-1 line-clamp-2 group-hover:text-purple-300 transition-colors cursor-pointer"
            onClick={handleOpen}
          >
            {title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {publishedDate && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(publishedDate).toLocaleDateString()}
              </span>
            )}
            {readTime && <span>{readTime} min read</span>}
          </div>
        </div>
        <button
          onClick={handleOpen}
          className="flex-shrink-0 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Open article"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* AI Summary Section */}
      {summary && (
        <div className="mb-3 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">
              AI Summary
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Snippet */}
      <p className="text-sm text-slate-400 mb-3 line-clamp-3">{snippet}</p>

      {/* Bullet Points */}
      {bullets && bullets.length > 0 && (
        <div className="mb-3">
          <ul className="space-y-1.5">
            {bullets.slice(0, expanded ? bullets.length : 3).map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-purple-400 mt-1">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {bullets.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              {expanded ? 'Show less' : `Show ${bullets.length - 3} more points`}
              <ArrowRight
                size={12}
                className={cn('transition-transform', expanded && 'rotate-90')}
              />
            </button>
          )}
        </div>
      )}

      {/* Citations */}
      {citations && citations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2 font-medium">Sources:</p>
          <div className="flex flex-wrap gap-2">
            {citations.map((cite, idx) => (
              <a
                key={idx}
                href={cite.url}
                onClick={e => {
                  e.stopPropagation();
                  handleOpen();
                }}
                className="text-xs text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1"
              >
                <BookOpen size={12} />
                {cite.title || cite.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-800">
        <button
          onClick={handleOpen}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          Read Article
          <ArrowRight size={14} />
        </button>
        {onSave && (
          <button
            onClick={e => {
              e.stopPropagation();
              onSave();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Save
          </button>
        )}
      </div>
    </ResponsiveCard>
  );
}


