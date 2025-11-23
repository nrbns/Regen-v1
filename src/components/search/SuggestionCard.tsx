/**
 * SuggestionCard - Card-based suggestion UI for Omnibox
 * Based on Figma UI/UX Prototype Flow redesign
 */

import { motion } from 'framer-motion';
import { Clock, Globe, Search, Sparkles, FileText, ExternalLink, Star } from 'lucide-react';

export type SuggestionType = 'history' | 'tab' | 'search' | 'ai' | 'command' | 'bookmark';

export interface SuggestionCardProps {
  type: SuggestionType;
  title: string;
  subtitle?: string;
  url?: string;
  icon?: React.ReactNode;
  badge?: string;
  onClick: () => void;
  onHover?: () => void;
  selected?: boolean;
  metadata?: {
    visitCount?: number;
    lastVisit?: number;
    favicon?: string;
  };
}

const typeIcons: Record<SuggestionType, React.ReactNode> = {
  history: <Clock size={16} />,
  tab: <Globe size={16} />,
  search: <Search size={16} />,
  ai: <Sparkles size={16} />,
  command: <FileText size={16} />,
  bookmark: <Star size={16} />,
};

const typeColors: Record<SuggestionType, string> = {
  history: 'text-gray-400',
  tab: 'text-blue-400',
  search: 'text-purple-400',
  ai: 'text-emerald-400',
  command: 'text-amber-400',
  bookmark: 'text-yellow-400',
};

export function SuggestionCard({
  type,
  title,
  subtitle,
  url,
  icon,
  badge,
  onClick,
  onHover,
  selected = false,
  metadata,
}: SuggestionCardProps) {
  const displayIcon = icon || typeIcons[type];
  const colorClass = typeColors[type];

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return null;
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={onHover}
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      className={`
        w-full text-left p-3 rounded-lg border transition-all
        ${
          selected
            ? 'bg-blue-500/20 border-blue-500/40 shadow-lg shadow-blue-500/10'
            : 'bg-gray-900/60 border-gray-800/50 hover:bg-gray-900/80 hover:border-gray-700/50'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500/40
      `}
      role="option"
      aria-selected={selected}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colorClass}`}>
          {metadata?.favicon ? (
            <img
              src={metadata.favicon}
              alt=""
              className="w-5 h-5 rounded"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`w-8 h-8 rounded-lg bg-gray-800/60 flex items-center justify-center ${colorClass}`}
            >
              {displayIcon}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-sm font-medium truncate ${selected ? 'text-blue-200' : 'text-gray-200'}`}
            >
              {title}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border border-purple-500/40 bg-purple-500/15 text-purple-200">
                {badge}
              </span>
            )}
          </div>
          {(subtitle || url) && (
            <div className={`text-xs truncate ${selected ? 'text-blue-300/80' : 'text-gray-400'}`}>
              {subtitle || url}
            </div>
          )}
          {metadata && (
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
              {metadata.visitCount && metadata.visitCount > 1 && (
                <span>{metadata.visitCount} visits</span>
              )}
              {metadata.lastVisit && <span>{formatTime(metadata.lastVisit)}</span>}
            </div>
          )}
        </div>

        {/* Action indicator */}
        <div className="flex-shrink-0">
          <ExternalLink
            size={14}
            className={`${selected ? 'text-blue-400' : 'text-gray-500'} opacity-0 group-hover:opacity-100 transition-opacity`}
          />
        </div>
      </div>
    </motion.button>
  );
}

export interface SuggestionCardGroupProps {
  title: string;
  suggestions: Omit<SuggestionCardProps, 'onClick' | 'onHover' | 'selected'>[];
  onSelect: (index: number) => void;
  selectedIndex?: number;
}

export function SuggestionCardGroup({
  title,
  suggestions,
  onSelect,
  selectedIndex,
}: SuggestionCardGroupProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
        {title}
      </div>
      <div className="space-y-1.5">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={index}
            {...suggestion}
            onClick={() => onSelect(index)}
            selected={selectedIndex === index}
          />
        ))}
      </div>
    </div>
  );
}
