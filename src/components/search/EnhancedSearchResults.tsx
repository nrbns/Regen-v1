/**
 * Enhanced Search Results Component
 * Combines AI result blocks, quick facts, trending results, and article view
 */

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { AIResultBlock, type AIResultBlockProps } from './AIResultBlock';
import { QuickFactsPanel, type QuickFact } from './QuickFactsPanel';
import { TrendingResults } from './TrendingResults';
import { ArticleView } from './ArticleView';
// import { ResponsiveCard } from '../common/ResponsiveCard'; // Unused
import { useMobileDetection } from '../../mobile';

export interface EnhancedSearchResult extends AIResultBlockProps {
  id: string;
}

export interface EnhancedSearchResultsProps {
  results: EnhancedSearchResult[];
  quickFacts?: QuickFact[];
  trendingQueries?: Array<{ query: string; count: number }>;
  loading?: boolean;
  onResultClick?: (url: string) => void;
  onSaveResult?: (result: EnhancedSearchResult) => void;
  showTrending?: boolean;
  showQuickFacts?: boolean;
  className?: string;
}

export function EnhancedSearchResults({
  results,
  quickFacts,
  trendingQueries,
  loading = false,
  onResultClick,
  onSaveResult,
  showTrending = true,
  showQuickFacts = true,
  className,
}: EnhancedSearchResultsProps) {
  const { isMobile } = useMobileDetection();
  const [selectedArticle, setSelectedArticle] = useState<EnhancedSearchResult | null>(null);
  const [_savedResults, setSavedResults] = useState<Set<string>>(new Set());

  const handleSave = (result: EnhancedSearchResult) => {
    setSavedResults(prev => new Set(prev).add(result.id));
    if (onSaveResult) {
      onSaveResult(result);
    }
  };

  const handleResultClick = (url: string, result?: EnhancedSearchResult) => {
    if (result && !isMobile) {
      // Desktop: show article view
      setSelectedArticle(result);
    } else {
      // Mobile or no result: open in new tab
      if (onResultClick) {
        onResultClick(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-purple-400" />
        <p className="text-slate-400">Searching...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Sparkles className="mb-4 h-12 w-12 text-slate-600" />
        <p className="text-slate-400">No results found</p>
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        {/* Quick Facts - Show at top if available */}
        {showQuickFacts && quickFacts && quickFacts.length > 0 && (
          <div className="mb-6">
            <QuickFactsPanel facts={quickFacts} />
          </div>
        )}

        {/* Main Results Grid */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((result, idx) => (
            <AIResultBlock
              key={result.id || idx}
              {...result}
              trending={idx === 0} // Mark first result as trending
              onOpen={url => handleResultClick(url, result)}
              onSave={() => handleSave(result)}
            />
          ))}
        </div>

        {/* Trending Searches - Show at bottom */}
        {showTrending && trendingQueries && trendingQueries.length > 0 && (
          <div className="mt-8">
            <TrendingResults
              results={trendingQueries.map(q => ({ query: q.query, count: q.count }))}
              onSelect={query => {
                // Handle trending query selection
                if (onResultClick) {
                  onResultClick(`search:${query}`);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Article View Modal */}
      {selectedArticle && (
        <ArticleView
          url={selectedArticle.url}
          title={selectedArticle.title}
          content={selectedArticle.summary}
          publishedDate={selectedArticle.publishedDate}
          readTime={selectedArticle.readTime}
          onClose={() => setSelectedArticle(null)}
          onSave={() => handleSave(selectedArticle)}
        />
      )}
    </>
  );
}
