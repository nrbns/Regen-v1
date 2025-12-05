/**
 * Regen Research - Premium Perplexity-Style UI
 * Real-time streaming research with sources, reasoning, and citations
 * FULL WORKING VERSION with streaming, animations, and live updates
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ExternalLink, Brain, Search, Zap, Globe, TrendingUp } from 'lucide-react';
import { useResearchWS } from '../../hooks/useResearchWS';
import { researchApi } from '../../lib/api-client';
import { useAppStore } from '../../state/appStore';

interface Source {
  id: string;
  url: string;
  title: string;
  snippet: string;
  score?: number;
  source?: string;
  lang?: string;
}

interface ReasoningStep {
  step: number;
  text: string;
  evidence?: string[];
}

interface ResearchState {
  jobId: string | null;
  query: string;
  answer: string;
  sources: Source[];
  reasoningSteps: ReasoningStep[];
  citations: Array<{ id: string; url: string; title: string }>;
  done: boolean;
  error: string | null;
  selectedSource: Source | null;
  showReasoning: boolean;
  isStreaming: boolean;
}

// Follow-up suggestions based on query
const generateFollowUpSuggestions = (query: string, answer: string): string[] => {
  const suggestions: string[] = [];
  const lowerQuery = query.toLowerCase();
  const lowerAnswer = answer.toLowerCase();

  // Smart suggestions based on query type
  if (lowerQuery.includes('compare') || lowerQuery.includes('vs')) {
    suggestions.push(
      'What are the key differences?',
      'Which one is better?',
      'What are the pros and cons?'
    );
  } else if (lowerQuery.includes('what is') || lowerQuery.includes('define')) {
    suggestions.push('How does it work?', 'What are the benefits?', 'What are the use cases?');
  } else if (lowerQuery.includes('how to') || lowerQuery.includes('how do')) {
    suggestions.push(
      'What are the prerequisites?',
      'What are common mistakes?',
      'What are best practices?'
    );
  } else if (lowerQuery.includes('why')) {
    suggestions.push('What are the causes?', 'What are the effects?', 'Can you explain more?');
  } else {
    // Generic intelligent suggestions
    suggestions.push('Tell me more', 'What are the key points?', 'Can you elaborate?');
  }

  // Add context-aware suggestions based on answer content
  if (lowerAnswer.includes('benefit') || lowerAnswer.includes('advantage')) {
    suggestions.push('What are the disadvantages?', 'What are the alternatives?');
  }
  if (lowerAnswer.includes('example') || lowerAnswer.includes('instance')) {
    suggestions.push('Give me more examples', 'Show me real-world applications');
  }

  return suggestions.slice(0, 6);
};

// Inject Perplexity-style citation superscripts
function injectCitations(text: string): string {
  if (!text) return '';

  // Match [1], [2], [s1], [source1] patterns
  return text
    .replace(/\[(\d+)\]/g, (match, num) => {
      return `<sup class="text-indigo-600 font-semibold cursor-pointer hover:text-indigo-800 transition-colors inline-block ml-0.5" title="Citation ${num}">[${num}]</sup>`;
    })
    .replace(/\[s(\d+)\]/gi, (match, num) => {
      return `<sup class="text-indigo-600 font-semibold cursor-pointer hover:text-indigo-800 transition-colors inline-block ml-0.5" title="Source ${num}">[${num}]</sup>`;
    })
    .replace(/\n/g, '<br/>');
}

// Skeleton loader component
function AnswerSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-full rounded bg-gray-200"></div>
      <div className="h-4 w-5/6 rounded bg-gray-200"></div>
      <div className="h-4 w-4/6 rounded bg-gray-200"></div>
      <div className="mt-4 h-4 w-3/4 rounded bg-gray-200"></div>
      <div className="h-4 w-full rounded bg-gray-200"></div>
    </div>
  );
}

export function RegenResearchPanel() {
  const [state, setState] = useState<ResearchState>({
    jobId: null,
    query: '',
    answer: '',
    sources: [],
    reasoningSteps: [],
    citations: [],
    done: false,
    error: null,
    selectedSource: null,
    showReasoning: false,
    isStreaming: false,
  });

  const [maxSources, setMaxSources] = useState(6);
  const [_isPaused, _setIsPaused] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [agentMode, setAgentMode] = useState<'web-search' | 'reasoning' | 'summarizer'>(
    'web-search'
  );
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const answerRef = useRef<HTMLDivElement>(null);
  const sourcesEndRef = useRef<HTMLDivElement>(null);

  // Mode switching
  const currentMode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);

  // Use the research WebSocket hook
  const wsState = useResearchWS(state.jobId || null);

  // Sync WebSocket state to local state with real-time updates
  useEffect(() => {
    if (wsState.streamedAnswer) {
      setState(prev => ({
        ...prev,
        answer: wsState.streamedAnswer,
        isStreaming: !wsState.done,
      }));
      setIsInitialLoad(false);
    }

    if (wsState.sources.length > 0) {
      setState(prev => ({
        ...prev,
        sources: wsState.sources.map((s, idx) => ({
          id: s.url || `source-${idx}`,
          url: s.url,
          title: s.title || 'Untitled',
          snippet: s.snippet || '',
          score: s.score || 0.5,
          source: s.source || 'unknown',
        })),
      }));

      // Auto-scroll sources panel when new sources arrive
      setTimeout(() => {
        sourcesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }

    if (wsState.reasoningSteps.length > 0) {
      setState(prev => ({
        ...prev,
        reasoningSteps: wsState.reasoningSteps.map((step, idx) => ({
          step: idx + 1,
          text: typeof step === 'string' ? step : step.text || '',
          evidence:
            typeof step === 'object' && 'citations' in step
              ? step.citations?.map(String)
              : undefined,
        })),
      }));
    }

    if (wsState.citations.length > 0) {
      setState(prev => ({
        ...prev,
        citations: wsState.citations.map(c => ({
          id: String(c.id || c.position || ''),
          url: c.url,
          title: c.title || 'Untitled',
        })),
      }));
    }

    if (wsState.done) {
      setState(prev => ({ ...prev, done: true, isStreaming: false }));
      setIsInitialLoad(false);

      // Generate follow-up suggestions when done
      if (state.query && state.answer) {
        setFollowUpSuggestions(generateFollowUpSuggestions(state.query, state.answer));
      }
    }

    if (wsState.error) {
      setState(prev => ({ ...prev, error: wsState.error || null, isStreaming: false }));
      setIsInitialLoad(false);
    }
  }, [wsState, state.query, state.answer]);

  // Auto-scroll answer as it streams
  useEffect(() => {
    if (answerRef.current && state.isStreaming) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [state.answer, state.isStreaming]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setState(prev => ({
      ...prev,
      query: query.trim(),
      jobId: null,
      answer: '',
      sources: [],
      reasoningSteps: [],
      citations: [],
      done: false,
      error: null,
      selectedSource: null,
      isStreaming: true,
    }));

    setFollowUpSuggestions([]);
    setIsInitialLoad(true);

    try {
      const response = await researchApi.run({
        query: query.trim(),
        lang: 'auto',
        clientId: `client-${Date.now()}`,
        sessionId: `session-${Date.now()}`,
        maxSources,
        mode: agentMode === 'web-search' ? 'deep' : agentMode === 'reasoning' ? 'deep' : 'fast',
        options: {
          maxChunks: 12,
          model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1',
        },
      });

      // FIX: Handle direct answers (when queue unavailable)
      if ((response as any).direct && (response as any).answer) {
        // Direct answer - no WebSocket needed
        console.log('[RegenResearch] Received direct answer (queue unavailable)');
        const responseAny = response as any;
        setState(prev => ({
          ...prev,
          jobId: response.jobId,
          answer: responseAny.answer,
          sources: (responseAny.citations || []).map((c: any, idx: number) => ({
            id: c.id || c.url || `source-${idx}`,
            url: c.url,
            title: c.title || 'Untitled',
            snippet: c.snippet || '',
            score: c.score || 0.5,
            source: c.source_type || 'unknown',
          })),
          citations: (responseAny.citations || []).map((c: any, idx: number) => ({
            id: String(c.id || idx + 1),
            url: c.url,
            title: c.title || 'Untitled',
          })),
          done: true,
          isStreaming: false,
        }));
        setIsInitialLoad(false);
        
        // Generate follow-up suggestions
        if (responseAny.answer) {
          setFollowUpSuggestions(generateFollowUpSuggestions(query, responseAny.answer));
        }
      } else if (response.jobId) {
        // Queue-based answer - use WebSocket streaming
        setState(prev => ({ ...prev, jobId: response.jobId }));
      } else {
        throw new Error('No jobId or direct answer returned');
      }
    } catch (error: any) {
      console.error('[RegenResearch] Failed to start research:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to start research';
      if (error?.message?.includes('Backend server is not running')) {
        errorMessage = 'Backend server is not running. Please start it with: npm run dev:server';
      } else if (error?.message?.includes('ConnectionError') || error?.message?.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to backend server. Make sure the server is running on port 4000.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isStreaming: false,
      }));
      setIsInitialLoad(false);
    }
  };

  const handleFollowUp = (followUpQuery: string) => {
    if (!followUpQuery.trim()) return;
    handleSearch(followUpQuery);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleFollowUp(suggestion);
  };

  const handleSourceClick = (source: Source) => {
    setState(prev => ({ ...prev, selectedSource: source }));
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#eef2ff] to-[#dbe4ff]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Regen"
              className="h-8 w-8 object-contain"
              onError={e => {
                // Fallback to icon if logo not found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1 className="text-[20px] font-semibold text-gray-800">Regen Research</h1>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1">
            <button
              onClick={() => setMode('Browse')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                currentMode === 'Browse'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
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
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
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
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
              title="Switch to Trade Mode"
            >
              <TrendingUp size={14} />
              <span className="hidden sm:inline">Trade</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-12">
        {/* Left: Query & Controls */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          {/* Search Box - Premium Styling */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
            <form
              onSubmit={e => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const query = (formData.get('query') as string) || '';
                handleSearch(query);
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                id="research-query-input"
                name="query"
                defaultValue={state.query}
                placeholder="Ask anything…"
                className="w-full rounded-lg border border-gray-300 bg-gray-50/80 px-4 py-3 text-[15px] text-gray-900 placeholder-gray-500 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                disabled={state.isStreaming}
              />
              <button
                type="submit"
                disabled={state.isStreaming}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 py-3 font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <Sparkles className="h-4 w-4" />
                {state.isStreaming ? 'Researching...' : '🔍 Research'}
              </button>
            </form>

            {/* Agent Tools Bar - Functional */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="mb-2 text-xs font-medium text-gray-600">Agent Mode:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAgentMode('web-search')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    agentMode === 'web-search'
                      ? 'border border-indigo-300 bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Search className="mr-1 inline h-3 w-3" />
                  Web Search
                </button>
                <button
                  onClick={() => setAgentMode('reasoning')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    agentMode === 'reasoning'
                      ? 'border border-indigo-300 bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Brain className="mr-1 inline h-3 w-3" />
                  Reasoning
                </button>
                <button
                  onClick={() => setAgentMode('summarizer')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    agentMode === 'summarizer'
                      ? 'border border-indigo-300 bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Zap className="mr-1 inline h-3 w-3" />
                  Summarizer
                </button>
              </div>
            </div>

            {/* Follow-up Box */}
            {state.jobId && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const followUp = (formData.get('followUp') as string) || '';
                    if (followUp.trim()) {
                      handleFollowUp(followUp);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    id="research-followup-input"
                    name="followUp"
                    placeholder="Refine: Why is BankNifty more volatile?"
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50/80 px-3 py-2 text-[14px] text-gray-900 placeholder-gray-500 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    disabled={state.isStreaming}
                  />
                  <button
                    type="submit"
                    disabled={state.isStreaming}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Ask
                  </button>
                </form>
              </div>
            )}

            {/* Settings */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-800">Agent Settings</h5>
              <div className="mb-2 text-xs text-gray-600">Max sources to fetch</div>
              <input
                type="range"
                min={1}
                max={12}
                value={maxSources}
                onChange={e => setMaxSources(Number(e.target.value))}
                className="w-full"
                disabled={state.isStreaming}
              />
              <div className="mt-1 text-xs text-gray-500">{maxSources} sources</div>
            </div>
          </div>

          {/* Status */}
          {state.jobId && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
              <div className="text-xs text-gray-500">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      wsState.connected ? 'animate-pulse bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  {wsState.connected ? 'Connected' : 'Connecting...'}
                </div>
                {state.isStreaming && (
                  <div className="font-medium text-indigo-600">Streaming answer...</div>
                )}
                {state.done && <div className="font-medium text-green-600">Research complete</div>}
                {state.error && (
                  <div className="mt-2 rounded-lg bg-red-50 p-3">
                    <div className="font-medium text-red-800">Error: {state.error}</div>
                    {state.error.includes('Backend server is not running') && (
                      <div className="mt-2 text-xs text-red-600">
                        💡 Tip: Open a terminal and run: <code className="bg-red-100 px-1 py-0.5 rounded">npm run dev:server</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Middle: Streaming Answer */}
        <div className="flex flex-col lg:col-span-6">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-gray-800">Answer</h2>
              {state.reasoningSteps.length > 0 && (
                <button
                  onClick={() =>
                    setState(prev => ({ ...prev, showReasoning: !prev.showReasoning }))
                  }
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-200"
                >
                  <Brain className="h-4 w-4" />
                  {state.showReasoning ? 'Hide' : 'Show'} Reasoning
                </button>
              )}
            </div>

            {/* Streaming Indicator */}
            {state.isStreaming && (
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <span>Generating answer…</span>
              </div>
            )}

            {/* Answer Content - With Skeleton or Streaming */}
            <div
              ref={answerRef}
              className="flex-1 overflow-y-auto text-[15px] leading-relaxed text-gray-900"
            >
              {isInitialLoad && !state.answer ? (
                <AnswerSkeleton />
              ) : state.answer ? (
                <div
                  className="animate-fadeIn whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: injectCitations(state.answer),
                  }}
                />
              ) : (
                <div className="italic text-gray-400">Waiting for answer...</div>
              )}
            </div>

            {/* Follow-up Questions - Auto-suggested */}
            {state.done && followUpSuggestions.length > 0 && (
              <div className="animate-fadeIn mt-6 border-t border-gray-200 pt-6">
                <p className="mb-3 text-sm font-semibold text-gray-700">Follow-up questions</p>
                <div className="flex flex-wrap gap-2">
                  {followUpSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition hover:scale-105 hover:bg-gray-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning Steps */}
            {state.showReasoning && state.reasoningSteps.length > 0 && (
              <div className="animate-fadeIn mt-6 border-t border-gray-200 pt-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Brain className="h-4 w-4" />
                  Reasoning Chain
                </h3>
                <div className="space-y-3">
                  {state.reasoningSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="animate-fadeIn rounded-lg bg-gray-50 p-3 text-sm"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className="mb-1 font-medium text-gray-700">
                        Step {step.step}: {step.text}
                      </div>
                      {step.evidence && step.evidence.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          Evidence: {step.evidence.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {state.citations.length > 0 && (
              <div className="animate-fadeIn mt-6 border-t border-gray-200 pt-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">Citations</h3>
                <div className="space-y-2">
                  {state.citations.map((citation, idx) => (
                    <div key={idx} className="text-xs text-gray-600">
                      [{citation.id}] {citation.title} -{' '}
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {citation.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sources Preview */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          {/* Sources List */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Sources</h4>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {state.sources.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  {state.isStreaming ? (
                    <div className="space-y-2">
                      <div className="mx-auto h-3 w-3/4 animate-pulse rounded bg-gray-200"></div>
                      <div className="mx-auto h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
                      <p className="mt-4">Fetching sources...</p>
                    </div>
                  ) : (
                    'No sources yet'
                  )}
                </div>
              ) : (
                <>
                  {state.sources.map((source, idx) => (
                    <div
                      key={source.id || idx}
                      onClick={() => handleSourceClick(source)}
                      className={`animate-fadeIn group cursor-pointer rounded-lg border p-3 transition ${
                        state.selectedSource?.url === source.url
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <p className="line-clamp-2 text-sm font-medium text-gray-800 transition-colors group-hover:text-indigo-600">
                        {source.title || 'Untitled'}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {new URL(source.url).hostname}
                      </p>
                      {source.snippet && (
                        <p className="mt-2 line-clamp-2 text-xs text-gray-600">{source.snippet}</p>
                      )}
                      {source.score && (
                        <p className="mt-1 text-xs text-gray-400">
                          Score: {source.score.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                  <div ref={sourcesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Source Preview */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">Source Preview</h4>
            {state.selectedSource ? (
              <div className="animate-fadeIn whitespace-pre-wrap text-sm font-[450] leading-relaxed text-gray-700">
                <div className="mb-1 font-medium text-gray-800">{state.selectedSource.title}</div>
                <a
                  href={state.selectedSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  {state.selectedSource.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <div className="mt-2 text-xs text-gray-600">{state.selectedSource.snippet}</div>
              </div>
            ) : (
              <div className="text-xs text-gray-400">Click a source to preview.</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Tip */}
      <div className="border-t border-gray-200 bg-white/80 px-6 py-3 backdrop-blur-sm">
        <div className="text-xs text-gray-500">
          💡 Tip: Streamed answers update as sources & LLM tokens arrive. Use "Show reasoning" to
          reveal chain-of-thought for transparency.
        </div>
      </div>
    </div>
  );
}
