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
        hovered && 'border-purple-500/30 shadow-lg shadow-purple-500/10',
        trending && 'border-emerald-500/30 bg-emerald-500/5',
        className
      )}
      hoverable
      padding="md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {trending && (
              <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                <TrendingUp size={12} />
                Trending
              </span>
            )}
            {source && (
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                {source}
              </span>
            )}
            {score !== undefined && (
              <span className="text-xs text-slate-500">{(score * 100).toFixed(0)}% match</span>
            )}
          </div>
          <h3
            className="mb-1 line-clamp-2 cursor-pointer text-lg font-semibold text-white transition-colors group-hover:text-purple-300"
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
          className="flex-shrink-0 rounded-lg bg-slate-800/50 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          aria-label="Open article"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* AI Summary Section */}
      {summary && (
        <div className="mb-3 rounded-lg border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-300">
              AI Summary
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-200">{summary}</p>
        </div>
      )}

      {/* Snippet */}
      <p className="mb-3 line-clamp-3 text-sm text-slate-400">{snippet}</p>

      {/* Bullet Points */}
      {bullets && bullets.length > 0 && (
        <div className="mb-3">
          <ul className="space-y-1.5">
            {bullets.slice(0, expanded ? bullets.length : 3).map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-1 text-purple-400">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {bullets.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs text-purple-400 transition-colors hover:text-purple-300"
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
        <div className="mt-3 border-t border-slate-800 pt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Sources:</p>
          <div className="flex flex-wrap gap-2">
            {citations.map((cite, idx) => (
              <a
                key={idx}
                href={cite.url}
                onClick={e => {
                  e.stopPropagation();
                  handleOpen();
                }}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 hover:underline"
              >
                <BookOpen size={12} />
                {cite.title || cite.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
        <button
          onClick={handleOpen}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
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
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            Save
          </button>
        )}
      </div>
    </ResponsiveCard>
  );
}
