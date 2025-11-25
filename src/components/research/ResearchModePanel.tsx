/**
 * Enhanced Research Mode Panel
 * Shows multi-source results with citations, confidence bars, contradictions, and verification
 */

import { useState } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { ProsConsTable } from './ProsConsTable';
import { toast } from '../../utils/toast';
import { useSettingsStore } from '../../state/settingsStore';
import { researchToTrade } from '../../core/agents/handoff';
import { summarizeOffline, isOfflineModeAvailable } from '../../core/offline/translator';

interface ResearchResult {
  query: string;
  language?: string;
  languageLabel?: string;
  languageConfidence?: number;
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    timestamp?: number;
    domain: string;
    relevanceScore: number;
    sourceType: 'news' | 'academic' | 'documentation' | 'forum' | 'other';
  }>;
  summary: string;
  citations: Array<{
    index: number;
    sourceIndex: number;
    quote: string;
    confidence: number;
  }>;
  confidence: number;
  contradictions?: Array<{
    claim: string;
    sources: number[];
    disagreement: 'minor' | 'major';
  }>;
  prosCons?: {
    pros: Array<{
      text: string;
      source: string;
      sourceUrl: string;
      sourceIndex: number;
      confidence: number;
    }>;
    cons: Array<{
      text: string;
      source: string;
      sourceUrl: string;
      sourceIndex: number;
      confidence: number;
    }>;
  };
  verification?: {
    verified: boolean;
    claimDensity: number;
    citationCoverage: number;
    ungroundedClaims: Array<{
      text: string;
      position: number;
      severity: 'low' | 'medium' | 'high';
    }>;
    hallucinationRisk: number;
    suggestions: string[];
  };
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'mr', label: 'Marathi' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ru', label: 'Russian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ar', label: 'Arabic' },
];

export default function ResearchModePanel() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [recencyWeight, setRecencyWeight] = useState(0.5);
  const [authorityWeight, setAuthorityWeight] = useState(0.5);
  const [includeCounterpoints, setIncludeCounterpoints] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const { activeId } = useTabsStore();

  const language = useSettingsStore(state => state.language || 'auto');
  const effectiveLanguage =
    selectedLanguage === 'auto' ? (language === 'auto' ? undefined : language) : selectedLanguage;

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    // Show loading toast with language info
    const langLabel = effectiveLanguage
      ? SUPPORTED_LANGUAGES.find(l => l.code === effectiveLanguage)?.label || effectiveLanguage
      : 'auto-detecting';
    toast.info(`Researching in ${langLabel}...`);

    try {
      // Check if offline and use offline mode if needed
      const isOffline = isOfflineModeAvailable();

      if (isOffline) {
        toast.info('Offline mode: Using cached results and offline translation');
        // For offline, we'd use cached results or simplified processing
        // This is a placeholder - in production, you'd load cached research results
        const offlineSummary = await summarizeOffline(query, effectiveLanguage);
        setResult({
          query: query.trim(),
          summary: offlineSummary,
          sources: [],
          citations: [],
          confidence: 0.6,
          language: effectiveLanguage,
          languageLabel: effectiveLanguage,
          languageConfidence: 0.7,
        });
        toast.success('Offline research complete');
        return;
      }

      // Call enhanced research API (online)
      const researchResult = (await ipc.research.queryEnhanced({
        query: query.trim(),
        maxSources: 12,
        includeCounterpoints,
        recencyWeight,
        authorityWeight,
        language: effectiveLanguage,
      })) as ResearchResult;

      setResult(researchResult);
      toast.success(`Research complete! Found ${researchResult.sources.length} sources.`);

      // Offer handoff to Trade mode if symbol detected
      const symbolMatch = query.match(/\b([A-Z]{2,5})\b/);
      if (symbolMatch && researchResult.summary) {
        // Auto-detect if this is a trading-related query
        const isTradingQuery = /nifty|sensex|stock|trade|price|market|buy|sell/i.test(query);
        if (isTradingQuery) {
          // Show option to send to Trade mode
          setTimeout(() => {
            toast.info('Sending to Trade mode...');
            // Automatically send to Trade mode after a short delay
            setTimeout(async () => {
              const handoffResult = await researchToTrade(
                researchResult.summary,
                symbolMatch[1],
                effectiveLanguage
              );
              if (handoffResult.success) {
                toast.success('Sent to Trade mode!');
              } else {
                toast.error(handoffResult.error || 'Handoff failed');
              }
            }, 500);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Research query failed:', error);
      toast.error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    try {
      if (activeId) {
        await ipc.tabs.navigate(activeId, url);
      } else {
        await ipc.tabs.create(url);
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'academic':
        return 'text-blue-400';
      case 'news':
        return 'text-green-400';
      case 'documentation':
        return 'text-purple-400';
      case 'forum':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500';
    if (confidence >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="h-full flex flex-col bg-[#1A1D28] text-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen size={20} />
            Research Mode
          </h2>
          <button
            onClick={() => setShowControls(!showControls)}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {showControls ? 'Hide' : 'Show'} Controls
          </button>
        </div>

        {/* Search Input */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter your research question..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              disabled={loading}
            />
          </div>
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-200"
            disabled={loading}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gray-800 space-y-3"
            >
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Recency Weight</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={recencyWeight}
                  onChange={e => setRecencyWeight(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Current: {(recencyWeight * 100).toFixed(0)}%
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Authority Weight</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={authorityWeight}
                  onChange={e => setAuthorityWeight(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Current: {(authorityWeight * 100).toFixed(0)}%
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeCounterpoints}
                  onChange={e => setIncludeCounterpoints(e.target.checked)}
                  className="rounded"
                />
                <span>Include Counterpoints</span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Searching multiple sources...</p>
            </div>
          </div>
        )}

        {result && (
          <>
            {/* Summary with Citations */}
            <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Summary</h3>
                <div className="flex items-center gap-2">
                  {result.languageLabel && (
                    <span className="text-xs text-gray-500">
                      Language:&nbsp;
                      <strong className="text-gray-300">{result.languageLabel}</strong>
                      {typeof result.languageConfidence === 'number' && (
                        <> ({(result.languageConfidence * 100).toFixed(0)}% detect)</>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getConfidenceColor(result.confidence)}`}
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300">
                      {(result.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-sm text-gray-300 whitespace-pre-wrap">
                {result.summary.split('\n').map((para, idx) => (
                  <p key={idx} className="mb-2">
                    {para}
                  </p>
                ))}
              </div>

              {/* Verification Status */}
              {result.verification && (
                <div
                  className={`mt-4 p-3 rounded-lg border ${
                    result.verification.verified
                      ? 'bg-green-900/20 border-green-700/50'
                      : 'bg-yellow-900/20 border-yellow-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.verification.verified ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <AlertTriangle size={16} className="text-yellow-400" />
                    )}
                    <span className="text-sm font-medium">
                      {result.verification.verified ? 'Verified' : 'Needs Review'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Citation Coverage: {result.verification.citationCoverage.toFixed(1)}%</div>
                    <div>
                      Hallucination Risk: {(result.verification.hallucinationRisk * 100).toFixed(1)}
                      %
                    </div>
                    {result.verification.suggestions.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium mb-1">Suggestions:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {result.verification.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pros/Cons Table */}
            {result.prosCons &&
              (result.prosCons.pros.length > 0 || result.prosCons.cons.length > 0) && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Pros & Cons Comparison
                  </h3>
                  <ProsConsTable
                    pros={result.prosCons.pros}
                    cons={result.prosCons.cons}
                    sources={result.sources}
                  />
                </div>
              )}

            {/* Contradictions */}
            {result.contradictions && result.contradictions.length > 0 && (
              <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-orange-400" />
                  <h3 className="font-semibold">Expert Disagreements</h3>
                </div>
                <div className="text-sm text-gray-300 space-y-2">
                  {result.contradictions.map((c, idx) => (
                    <div key={idx} className="border-l-2 border-orange-500 pl-3">
                      <div className="font-medium">{c.claim}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Sources {c.sources.join(', ')} have {c.disagreement} disagreements
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={16} />
                Sources ({result.sources.length})
              </h3>
              <div className="space-y-2">
                {result.sources.map((source, idx) => (
                  <motion.div
                    key={source.url}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gray-900/60 rounded-lg p-3 border border-gray-800/50 hover:border-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-medium ${getSourceTypeColor(source.sourceType)}`}
                          >
                            {source.sourceType.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {source.relevanceScore.toFixed(1)}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm text-gray-200 truncate">
                          {source.title}
                        </h4>
                        <p className="text-xs text-gray-400 truncate mt-1">{source.domain}</p>
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{source.snippet}</p>
                      </div>
                      <button
                        onClick={() => handleOpenUrl(source.url)}
                        className="p-2 hover:bg-gray-800/60 rounded-lg transition-colors"
                        title="Open in tab"
                      >
                        <ExternalLink size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Citations */}
            {result.citations.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Citations</h3>
                <div className="space-y-2">
                  {result.citations.map(citation => {
                    const source = result.sources[citation.sourceIndex];
                    return (
                      <div
                        key={citation.index}
                        className="bg-gray-900/60 rounded-lg p-3 border border-gray-800/50 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-blue-400">
                                [{citation.index}]
                              </span>
                              <span className="text-xs text-gray-400">
                                Confidence: {(citation.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-gray-300 italic">"{citation.quote}..."</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Source: {source?.title || 'Unknown'}
                            </p>
                          </div>
                          {source && (
                            <button
                              onClick={() => handleOpenUrl(source.url)}
                              className="p-2 hover:bg-gray-800/60 rounded-lg transition-colors"
                              title="View source"
                            >
                              <ExternalLink size={14} className="text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
