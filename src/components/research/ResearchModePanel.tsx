/**
 * Perplexity-Style Research Mode Panel
 * Clean AI research interface - NO TABS, NO WEBVIEWS, PURE AI
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
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
import { LanguageSelector } from '../integrations/LanguageSelector';
import type { SupportedLanguage } from '../../core/language/multiLanguageAI';

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
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(
    (language === 'auto' ? 'en' : language) as SupportedLanguage
  );
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
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-purple-800/50 bg-black/20 p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Search Status Indicator */}
            <SearchStatusIndicator />
            <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-2">
              <Sparkles className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent">
                Research Mode
              </h1>
              <p className="text-sm text-gray-400">AI-powered research in any language</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/60 p-1">
              <button
                onClick={() => setMode('Browse')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  currentMode === 'Browse'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
                }`}
                title="Switch to Browse Mode"
              >
                <Globe size={14} />
                <span className="hidden sm:inline">Browse</span>
              </button>
              <button
                onClick={() => setMode('Research')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  currentMode === 'Research'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
                }`}
                title="Switch to Research Mode"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Research</span>
              </button>
              <button
                onClick={() => setMode('Trade')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  currentMode === 'Trade'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
                }`}
                title="Switch to Trade Mode"
              >
                <TrendingUp size={14} />
                <span className="hidden sm:inline">Trade</span>
              </button>
            </div>

            {/* Phase 2: Enhanced Language Selector */}
            <LanguageSelector
              defaultLanguage={selectedLang}
              onLanguageChange={lang => {
                setSelectedLang(lang);
                useSettingsStore.getState().setLanguage(lang);
              }}
              onTranslate={async (text, targetLang) => {
                // Use multi-language AI for translation
                const { multiLanguageAI } = await import('../../core/language/multiLanguageAI');
                return multiLanguageAI.translate(text, targetLang);
              }}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
            className="w-full rounded-2xl border border-slate-700/50 bg-slate-800/60 py-4 pl-12 pr-4 text-lg placeholder-gray-400 transition-all focus:outline-none focus:ring-4 focus:ring-purple-600/50 disabled:opacity-50"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
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
            className="mb-6 rounded-xl border border-red-700/50 bg-red-900/20 p-4 text-red-200"
          >
            {error}
          </motion.div>
        )}

        {!result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-16 max-w-4xl text-center"
          >
            <h2 className="mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-5xl font-bold text-transparent">
              Ask Regen in Any Language
            </h2>
            <p className="mb-8 text-xl text-gray-300">
              Your best answers and agent handoffs land here automatically.
            </p>

            {/* Example Buttons */}
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
              {EXAMPLES.map((ex, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSubmit(ex)}
                  className="group rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 text-left transition-all hover:bg-slate-700/60"
                >
                  <p className="font-medium text-gray-200 transition-colors group-hover:text-white">
                    {ex}
                  </p>
                  <ArrowRight className="mt-2 h-5 w-5 text-purple-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
              <p className="text-gray-400">Researching in {langMeta.nativeName}...</p>
            </div>
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto max-w-4xl space-y-6"
          >
            {/* Summary */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
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
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-200">
                  {result.summary}
                </p>
              </div>
              {result.verification && (
                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    result.verification.verified
                      ? 'border-green-700/50 bg-green-900/20'
                      : 'border-yellow-700/50 bg-yellow-900/20'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {result.verification.verified ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-yellow-400" />
                    )}
                    <span className="font-medium">
                      {result.verification.verified ? 'Verified' : 'Needs Review'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-400">
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
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-green-700/50 bg-green-900/20 p-6">
                    <h4 className="mb-4 flex items-center gap-2 text-xl font-bold text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      Pros
                    </h4>
                    <ul className="space-y-3">
                      {((result as any).prosCons.pros || []).map((p: any, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-400" />
                          <span className="text-gray-200">{p.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-red-700/50 bg-red-900/20 p-6">
                    <h4 className="mb-4 flex items-center gap-2 text-xl font-bold text-red-400">
                      <XCircle className="h-5 w-5" />
                      Cons
                    </h4>
                    <ul className="space-y-3">
                      {((result as any).prosCons.cons || []).map((c: any, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
                          <span className="text-gray-200">{c.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            {/* Sources */}
            {result.sources.length > 0 && (
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-xl">
                <h3 className="mb-4 text-xl font-bold">Sources ({result.sources.length})</h3>
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
                      className="group block rounded-xl bg-slate-700/30 p-4 transition-all hover:bg-slate-700/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-medium uppercase text-purple-400">
                              {source.sourceType || 'SOURCE'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Score: {source.relevanceScore?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <h4 className="line-clamp-1 font-medium text-gray-200 transition-colors group-hover:text-white">
                            {source.title}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                            {source.snippet}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">{source.domain}</p>
                        </div>
                        <ExternalLink className="h-5 w-5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-purple-400" />
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
                className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
              />
              <button
                onClick={() => handleFollowUp(followUp)}
                disabled={loading || !followUp.trim()}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-bold transition-all hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
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
