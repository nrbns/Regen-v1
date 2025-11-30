/**
 * Streaming Agent Sidebar - Real-time Agent Research
 * Listens to Tauri agent-event stream and displays incremental updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Play,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTabsStore } from '../../state/tabsStore';
import { toast } from '../../utils/toast';

// AgentEvent types matching Tauri backend
type AgentEvent =
  | { type: 'agent_start'; payload: { query: string; url?: string } }
  | { type: 'partial_summary'; payload: { text: string; chunk_index?: number; cached?: boolean } }
  | { type: 'action_suggestion'; payload: Action }
  | { type: 'final_summary'; payload: FinalSummary }
  | { type: 'agent_end'; payload: { success: boolean; cached?: boolean } }
  | { type: 'error'; payload: { message: string } };

interface Action {
  id: string;
  action_type: string;
  label: string;
  payload: any;
  confidence?: number;
}

interface FinalSummary {
  summary: {
    short: string;
    bullets: string[];
    keywords: string[];
  };
  citations?: number;
  hallucination?: 'low' | 'medium' | 'high';
  confidence?: number;
}

export function StreamingAgentSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [query, setQuery] = useState('');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState('');
  const [finalSummary, setFinalSummary] = useState<FinalSummary | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);

  const { tabs, activeId } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeId);
  const unlistenRef = useRef<(() => void) | null>(null);

  // Update current URL when active tab changes
  useEffect(() => {
    if (activeTab) {
      setCurrentUrl(activeTab.url || null);
    }
  }, [activeTab]);

  // Listen for agent events
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlistenFn = await listen('agent-event', (event: any) => {
          const agentEvent = event.payload as AgentEvent;

          switch (agentEvent.type) {
            case 'agent_start':
              setIsStreaming(true);
              setSummaryText('');
              setFinalSummary(null);
              setSuggestedActions([]);
              setError(null);
              setIsCached(false);
              setQuery(agentEvent.payload.query);
              break;

            case 'partial_summary':
              if (agentEvent.payload.cached) {
                setIsCached(true);
              }
              setSummaryText(prev => prev + agentEvent.payload.text);
              break;

            case 'action_suggestion':
              setSuggestedActions(prev => [...prev, agentEvent.payload]);
              break;

            case 'final_summary':
              setFinalSummary(agentEvent.payload);
              setIsStreaming(false);
              break;

            case 'agent_end':
              setIsStreaming(false);
              if (agentEvent.payload.success) {
                if (agentEvent.payload.cached) {
                  toast.success('Loaded from cache');
                } else {
                  toast.success('Research complete');
                }
              }
              break;

            case 'error':
              setError(agentEvent.payload.message);
              setIsStreaming(false);
              toast.error(agentEvent.payload.message);
              break;
          }
        });

        unlistenRef.current = unlistenFn;
      } catch (err) {
        console.error('[StreamingAgentSidebar] Failed to setup listener:', err);
      }
    };

    setupListener();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  const startAgent = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    try {
      // Extract page text first if URL is available
      let pageText: string | undefined;
      if (currentUrl) {
        try {
          const extracted = await invoke<{
            url: string;
            title: string;
            text: string;
            html_hash: string;
            word_count: number;
          }>('extract_page_text', { url: currentUrl });

          pageText = extracted.text;
        } catch (err) {
          console.warn('[StreamingAgentSidebar] Failed to extract page text:', err);
        }
      }

      // Start streaming agent
      await invoke('research_agent_stream', {
        request: {
          query: query.trim(),
          url: currentUrl || undefined,
          context: pageText ? pageText.substring(0, 2000) : undefined, // Limit context size
          mode: 'local' as const,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to start agent');
      setIsStreaming(false);
      toast.error('Failed to start agent research');
    }
  }, [query, currentUrl]);

  const stopAgent = useCallback(() => {
    // Note: Tauri doesn't have built-in cancellation, but we can reset state
    setIsStreaming(false);
    setError('Cancelled by user');
    toast.info('Agent stopped');
  }, []);

  const confirmAndExecuteAction = useCallback((action: Action) => {
    setPendingAction(action);
  }, []);

  const executeAction = useCallback(async (action: Action) => {
    setPendingAction(null); // Close modal

    try {
      const response = await invoke('execute_agent', {
        request: {
          actions: [action],
          session_id: undefined,
        },
      });

      toast.success(`Action "${action.label}" executed`);

      // Remove executed action from suggestions
      setSuggestedActions(prev => prev.filter(a => a.id !== action.id));
    } catch (err: any) {
      toast.error(`Failed to execute action: ${err.message}`);
    }
  }, []);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const clearResults = useCallback(() => {
    setSummaryText('');
    setFinalSummary(null);
    setSuggestedActions([]);
    setError(null);
    setIsCached(false);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 font-semibold transition-all hover:scale-105"
      >
        <Bot className="w-5 h-5" />
        <span>AI Agent</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">AI Research Agent</h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Input */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !isStreaming) {
                startAgent();
              }
            }}
            placeholder="Research query..."
            disabled={isStreaming}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              onClick={stopAgent}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={startAgent}
              disabled={!query.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>
        {currentUrl && (
          <p className="text-xs text-gray-400 mt-2 truncate" title={currentUrl}>
            Analyzing: {new URL(currentUrl).hostname}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400 font-medium">Error</p>
              <p className="text-xs text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isStreaming && !summaryText && (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Starting research...</span>
          </div>
        )}

        {/* Streaming Summary */}
        {summaryText && (
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">
                {isStreaming ? 'Streaming...' : 'Summary'}
                {isCached && <span className="ml-2 text-xs text-green-400">(Cached)</span>}
              </h3>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">
              {summaryText}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Final Summary */}
        {finalSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-semibold text-white">Final Summary</h3>
              {finalSummary.confidence && (
                <span className="ml-auto text-xs text-gray-400">
                  {Math.round(finalSummary.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300 mb-3">{finalSummary.summary.short}</p>

            {finalSummary.summary.bullets.length > 0 && (
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1 mb-3">
                {finalSummary.summary.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            )}

            {finalSummary.summary.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {finalSummary.summary.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Action Suggestions */}
        {suggestedActions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Suggested Actions
            </h3>
            {suggestedActions.map(action => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-800 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{action.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{action.action_type}</p>
                  </div>
                  {action.confidence && (
                    <span className="text-xs text-gray-400">
                      {Math.round(action.confidence * 100)}%
                    </span>
                  )}
                </div>
                <button
                  onClick={() => confirmAndExecuteAction(action)}
                  className="w-full mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
                >
                  Execute
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isStreaming && !summaryText && !finalSummary && !error && (
          <div className="text-center text-gray-400 py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Enter a query to start research</p>
            <p className="text-xs mt-2 text-gray-500">
              The agent will analyze the current page and provide insights
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {(summaryText || finalSummary) && (
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <button
            onClick={clearResults}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            Clear Results
          </button>
        </div>
      )}

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {pendingAction && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelAction}
              className="fixed inset-0 bg-black/50 z-[60]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Confirm Action</h3>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-300 mb-2">The agent wants to execute:</p>
                  <div className="bg-slate-900 rounded p-3 mb-2">
                    <p className="text-sm font-medium text-white">{pendingAction.label}</p>
                    <p className="text-xs text-gray-400 mt-1">Type: {pendingAction.action_type}</p>
                    {pendingAction.confidence && (
                      <p className="text-xs text-gray-400 mt-1">
                        Confidence: {Math.round(pendingAction.confidence * 100)}%
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-yellow-400">
                    ⚠️ This action will be executed immediately. Please review before confirming.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={cancelAction}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeAction(pendingAction)}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
                  >
                    Confirm & Execute
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
