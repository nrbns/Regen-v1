/**
 * Perplexity-Style Research Mode Panel
 * Clean AI research interface - NO TABS, NO WEBVIEWS, PURE AI
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Languages,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Globe,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../state/settingsStore';
import { useAppStore } from '../../state/appStore';
import { getLanguageMeta } from '../../constants/languageMeta';
import type { ResearchResult } from '../../types/research';
import { SearchStatusIndicator } from '../search/SearchStatusIndicator';

interface ResearchModePanelProps {
  query?: string;
  result?: ResearchResult | null;
  loading?: boolean;
  error?: string | null;
  onSearch?: (query: string) => void;
  onFollowUp?: (query: string) => void;
}

const EXAMPLES = [
  'Compare Nifty vs BankNifty',
  'हिंदी में iPhone 16 vs Samsung S25',
  'தமிழில் AI trading strategy',
  'Best mutual funds for 2026',
  'निफ्टी की तुलना करें',
  'நிஃப்டி ஒப்பீடு',
];

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'हिंदी', native: 'Hindi' },
  { code: 'ta', label: 'தமிழ்', native: 'Tamil' },
  { code: 'bn', label: 'বাংলা', native: 'Bengali' },
  { code: 'te', label: 'తెలుగు', native: 'Telugu' },
  { code: 'mr', label: 'मराठी', native: 'Marathi' },
];

export default function ResearchModePanel({
  query: parentQuery = '',
  result: parentResult = null,
  loading: parentLoading = false,
  error: parentError = null,
  onSearch,
  onFollowUp,
}: ResearchModePanelProps) {
  const [query, setQuery] = useState(parentQuery);
  const [followUp, setFollowUp] = useState('');
  const language = useSettingsStore(state => state.language || 'en');
  const [selectedLang, setSelectedLang] = useState(language === 'auto' ? 'en' : language);
  const langMeta = getLanguageMeta(selectedLang);
  const currentMode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);

  // Sync query with parent
  useEffect(() => {
    if (parentQuery !== query) {
      setQuery(parentQuery);
    }
  }, [parentQuery]);

  const handleSubmit = (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    onSearch?.(q);
  };

  const handleFollowUp = (q: string) => {
    if (!q.trim()) return;
    setFollowUp('');
    onFollowUp?.(q);
  };

  const handleOpenSource = (url: string) => {
    // Open in new window instead of tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const result = parentResult;
  const loading = parentLoading;
  const error = parentError;

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-purple-800/50 bg-black/20 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Search Status Indicator */}
            <SearchStatusIndicator />
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Research Mode
              </h1>
              <p className="text-sm text-gray-400">AI-powered research in any language</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-lg p-1">
              <button
                onClick={() => setMode('Browse')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentMode === 'Browse'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Switch to Browse Mode"
              >
                <Globe size={14} />
                <span className="hidden sm:inline">Browse</span>
              </button>
              <button
                onClick={() => setMode('Research')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentMode === 'Research'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Switch to Research Mode"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Research</span>
              </button>
              <button
                onClick={() => setMode('Trade')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentMode === 'Trade'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Switch to Trade Mode"
              >
                <TrendingUp size={14} />
                <span className="hidden sm:inline">Trade</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-gray-400" />
              <select
                value={selectedLang}
                onChange={e => {
                  setSelectedLang(e.target.value);
                  useSettingsStore.getState().setLanguage(e.target.value);
                }}
                className="bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {LANGUAGE_OPTIONS.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label} ({lang.native})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !loading) {
                handleSubmit(query);
              }
            }}
            placeholder={
              selectedLang === 'hi'
                ? 'हिंदी में पूछें: निफ्टी vs बैंक निफ्टी'
                : selectedLang === 'ta'
                  ? 'தமிழில் கேளுங்கள்: நிஃப்டி ஒப்பீடு'
                  : 'Ask in any language: Compare Nifty vs BankNifty...'
            }
            disabled={loading}
            className="w-full pl-12 pr-4 py-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl text-lg placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-600/50 transition-all disabled:opacity-50"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-200"
          >
            {error}
          </motion.div>
        )}

        {!result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center mt-16"
          >
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Ask Regen in Any Language
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Your best answers and agent handoffs land here automatically.
            </p>

            {/* Example Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {EXAMPLES.map((ex, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubmit(ex)}
                  className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl text-left hover:bg-slate-700/60 transition-all group"
                >
                  <p className="font-medium text-gray-200 group-hover:text-white transition-colors">
                    {ex}
                  </p>
                  <ArrowRight className="w-5 h-5 mt-2 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="max-w-4xl mx-auto mt-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400">Researching in {langMeta.nativeName}...</p>
            </div>
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Summary */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Summary</h3>
                {((result as any).languageLabel || (result as any).language) && (
                  <span className="text-sm text-gray-400">
                    {(result as any).languageLabel || (result as any).language}
                    {(result as any).languageConfidence != null && (
                      <span className="ml-2 text-gray-500">
                        ({((result as any).languageConfidence * 100).toFixed(0)}% confidence)
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-gray-200 whitespace-pre-wrap">
                  {result.summary}
                </p>
              </div>
              {result.verification && (
                <div
                  className={`mt-4 p-4 rounded-xl border ${
                    result.verification.verified
                      ? 'bg-green-900/20 border-green-700/50'
                      : 'bg-yellow-900/20 border-yellow-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.verification.verified ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-yellow-400" />
                    )}
                    <span className="font-medium">
                      {result.verification.verified ? 'Verified' : 'Needs Review'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>
                      Citation Coverage:{' '}
                      {result.verification.citationCoverage != null
                        ? `${result.verification.citationCoverage.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                    <div>
                      Hallucination Risk:{' '}
                      {result.verification.hallucinationRisk != null
                        ? `${(result.verification.hallucinationRisk * 100).toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pros/Cons - Handle optional prosCons field */}
            {(result as any).prosCons &&
              ((result as any).prosCons.pros?.length > 0 ||
                (result as any).prosCons.cons?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-900/20 border border-green-700/50 rounded-2xl p-6">
                    <h4 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Pros
                    </h4>
                    <ul className="space-y-3">
                      {((result as any).prosCons.pros || []).map((p: any, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-200">{p.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-900/20 border border-red-700/50 rounded-2xl p-6">
                    <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Cons
                    </h4>
                    <ul className="space-y-3">
                      {((result as any).prosCons.cons || []).map((c: any, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-200">{c.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            {/* Sources */}
            {result.sources.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Sources ({result.sources.length})</h3>
                <div className="space-y-3">
                  {result.sources.map((source, i) => (
                    <motion.a
                      key={source.id || source.url || i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={e => {
                        e.preventDefault();
                        handleOpenSource(source.url);
                      }}
                      className="block p-4 bg-slate-700/30 rounded-xl hover:bg-slate-700/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-purple-400 uppercase">
                              {source.sourceType || 'SOURCE'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Score: {source.relevanceScore?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-1">
                            {source.title}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {source.snippet}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">{source.domain}</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up */}
            <div className="flex gap-3">
              <input
                type="text"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !loading) {
                    handleFollowUp(followUp);
                  }
                }}
                placeholder="Ask a follow-up question..."
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
              />
              <button
                onClick={() => handleFollowUp(followUp)}
                disabled={loading || !followUp.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Ask
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
