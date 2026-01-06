/**
 * Streaming Agent Sidebar - Real-time Agent Research
 * Listens to Tauri agent-event stream and displays incremental updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isMVPFeatureEnabled } from '../../config/mvpFeatureFlags';
import {
  Bot,
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

// WebSocket client for real-time streaming
const WS_URL = 'ws://127.0.0.1:18080/agent_ws';

// PR: Fix tab switch - AgentEvent types with tabId tracking
type AgentEvent =
  | {
      type: 'agent_start';
      tabId?: string;
      sessionId?: string;
      payload: { query: string; url?: string };
    }
  | {
      type: 'partial_summary';
      tabId?: string;
      sessionId?: string;
      payload: { text: string; chunk_index?: number; cached?: boolean };
    }
  | { type: 'action_suggestion'; tabId?: string; sessionId?: string; payload: Action }
  | { type: 'final_summary'; tabId?: string; sessionId?: string; payload: FinalSummary }
  | {
      type: 'agent_end';
      tabId?: string;
      sessionId?: string;
      payload: { success: boolean; cached?: boolean };
    }
  | { type: 'error'; tabId?: string; sessionId?: string; payload: { message: string } }
  | { type: 'agent_busy'; tabId?: string; sessionId?: string; payload: { message: string } };

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
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update current URL when active tab changes
  useEffect(() => {
    if (activeTab) {
      setCurrentUrl(activeTab.url || null);
    }
  }, [activeTab]);

  // Connect to WebSocket for real-time streaming
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WebSocket] Connected to agent server');
          reconnectAttempts = 0;

          // Send ping to verify connection
          ws?.send(JSON.stringify({ type: 'ping' }));
        };

        ws.onmessage = event => {
          // PR: Fix tab switch - filter events by tabId
          const currentActiveId = useTabsStore.getState().activeId;
          try {
            const data = JSON.parse(event.data);

            // Handle pong
            if (data.type === 'pong') {
              return;
            }

            // Handle connection confirmation
            if (data.type === 'connected') {
              console.log('[WebSocket] Connection confirmed:', data.connection_id);
              return;
            }

            // PR: Fix tab switch - filter events by tabId
            const eventTabId = data.tabId || data.tab_id;
            if (eventTabId && eventTabId !== currentActiveId) {
              console.log('[StreamingAgentSidebar] Ignoring event for inactive tab', {
                eventTabId,
                currentActiveId,
                type: data.type,
              });
              return;
            }

            // Handle agent events
            const agentEvent = data as AgentEvent;

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

              case 'agent_busy':
                setError(agentEvent.payload.message);
                setIsStreaming(false);
                toast.warning(agentEvent.payload.message);
                break;
            }
          } catch (err) {
            console.error('[WebSocket] Failed to parse message:', err);
          }
        };

        ws.onerror = error => {
          console.error('[WebSocket] Error:', error);
        };

        ws.onclose = event => {
          console.log('[WebSocket] Connection closed', event.code, event.reason);
          wsRef.current = null;

          // Don't reconnect if it was a normal closure (code 1000) or user-initiated
          if (event.code === 1000 || event.code === 1001) {
            console.log('[WebSocket] Normal closure, not reconnecting');
            return;
          }

          // Attempt reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

            wsReconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else {
            console.error('[WebSocket] Max reconnect attempts reached');
            toast.error('Lost connection to agent server. Please refresh the page.');
            setError('Connection lost. Please refresh to reconnect.');
          }
        };
      } catch (err) {
        console.error('[WebSocket] Failed to connect:', err);
        // Fallback to Tauri events if WebSocket fails
        setupTauriListener();
      }
    };

    // Fallback: Listen for Tauri events if WebSocket unavailable
    const setupTauriListener = async () => {
      try {
        const unlistenFn = await listen('agent-event', (_event: any) => {
          // Same event handling as WebSocket (handled by WebSocket connection)
          // This is a fallback that's not currently used
        });
        unlistenRef.current = unlistenFn;
      } catch (err) {
        console.error('[StreamingAgentSidebar] Failed to setup Tauri listener:', err);
      }
    };

    connectWebSocket();

    // MEMORY LEAK FIX: Listen for tab close to cleanup WebSocket
    const handleTabClose = (() => {
      if (ws) {
        ws.close();
      }
      if (wsReconnectTimeoutRef.current) {
        clearTimeout(wsReconnectTimeoutRef.current);
      }
    }) as EventListener;

    window.addEventListener('tab-closed', handleTabClose);

    return () => {
      window.removeEventListener('tab-closed', handleTabClose);
      if (ws) {
        ws.close();
      }
      if (wsReconnectTimeoutRef.current) {
        clearTimeout(wsReconnectTimeoutRef.current);
      }
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  const v1Mode = isV1ModeEnabled();

  const startAgent = useCallback(async () => {
    if (minimalDemo) {
      toast.info('Agent start is disabled in minimal demo UI for stability');
      return;
    }

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

      // PR: Fix tab switch - include tabId in start_agent message
      const activeTabId = useTabsStore.getState().activeId;
      const activeTab = useTabsStore.getState().tabs.find(t => t.id === activeTabId);

      // Try WebSocket first, fallback to Tauri invoke
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send start_agent message via WebSocket with tabId
        wsRef.current.send(
          JSON.stringify({
            type: 'start_agent',
            tabId: activeTabId,
            tab_id: activeTabId, // Support both camelCase and snake_case
            query: query.trim(),
            url: currentUrl || undefined,
            context: pageText ? pageText.substring(0, 2000) : undefined,
            mode: 'local',
            session_id: activeTab?.sessionId || undefined,
            sessionId: activeTab?.sessionId || undefined,
          })
        );
        console.log('[StreamingAgentSidebar] Sent start_agent', {
          tabId: activeTabId,
          url: currentUrl,
        });
      } else {
        // Fallback to Tauri invoke
        await invoke('research_agent_stream', {
          request: {
            query: query.trim(),
            url: currentUrl || undefined,
            context: pageText ? pageText.substring(0, 2000) : undefined,
            mode: 'local' as const,
          },
        });
      }
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
      await invoke('execute_agent', {
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
    if (v1Mode) {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex hidden items-center gap-2 rounded-full bg-slate-800 p-3 text-xs text-slate-300 shadow-sm transition-all md:flex"
          title="Open Agent (collapsed)"
        >
          <Bot className="h-4 w-4" />
          <span>Agent</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex hidden items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 p-4 font-semibold text-white shadow-2xl transition-all hover:scale-105 hover:from-purple-700 hover:to-pink-700 md:flex"
      >
        <Bot className="h-5 w-5" />
        <span>AI Agent</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed bottom-0 right-0 top-0 z-50 flex w-96 flex-col border-l border-slate-700 bg-slate-900 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">AI Research Agent</h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 transition-colors hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Input */}
      <div className="border-b border-slate-700 p-4">
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
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              onClick={stopAgent}
              className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={startAgent}
              disabled={!query.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
        </div>
        {currentUrl && (
          <p className="mt-2 truncate text-xs text-gray-400" title={currentUrl}>
            Analyzing: {new URL(currentUrl).hostname}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-700 bg-red-900/20 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Error</p>
              <p className="mt-1 text-xs text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isStreaming && !summaryText && (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Starting research...</span>
          </div>
        )}

        {/* Streaming Summary */}
        {summaryText && (
          <div className="rounded-lg bg-slate-800 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">
                {isStreaming ? 'Streaming...' : 'Summary'}
                {isCached && <span className="ml-2 text-xs text-green-400">(Cached)</span>}
              </h3>
            </div>
            <div className="whitespace-pre-wrap text-sm text-gray-300">
              {summaryText}
              {isStreaming && (
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-purple-400" />
              )}
            </div>
          </div>
        )}

        {/* Final Summary */}
        {finalSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-slate-800 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <h3 className="text-sm font-semibold text-white">Final Summary</h3>
              {finalSummary.confidence && (
                <span className="ml-auto text-xs text-gray-400">
                  {Math.round(finalSummary.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="mb-3 text-sm text-gray-300">{finalSummary.summary.short}</p>

            {finalSummary.summary.bullets.length > 0 && (
              <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-gray-300">
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
                    className="rounded bg-purple-900/30 px-2 py-1 text-xs text-purple-300"
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
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Suggested Actions
            </h3>
            {suggestedActions.map(action => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-slate-700 bg-slate-800 p-3"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{action.label}</p>
                    <p className="mt-1 text-xs text-gray-400">{action.action_type}</p>
                  </div>
                  {action.confidence && (
                    <span className="text-xs text-gray-400">
                      {Math.round(action.confidence * 100)}%
                    </span>
                  )}
                </div>
                <button
                  onClick={() => confirmAndExecuteAction(action)}
                  className="mt-2 w-full rounded bg-purple-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-purple-700"
                >
                  Execute
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isStreaming && !summaryText && !finalSummary && !error && (
          <div className="py-8 text-center text-gray-400">
            <Bot className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm">Enter a query to start research</p>
            <p className="mt-2 text-xs text-gray-500">
              The agent will analyze the current page and provide insights
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {(summaryText || finalSummary) && (
        <div className="border-t border-slate-700 bg-slate-800 p-4">
          <button
            onClick={clearResults}
            className="w-full rounded bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
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
              className="fixed inset-0 z-[60] bg-black/50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Confirm Action</h3>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-300">The agent wants to execute:</p>
                  <div className="mb-2 rounded bg-slate-900 p-3">
                    <p className="text-sm font-medium text-white">{pendingAction.label}</p>
                    <p className="mt-1 text-xs text-gray-400">Type: {pendingAction.action_type}</p>
                    {pendingAction.confidence && (
                      <p className="mt-1 text-xs text-gray-400">
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
                    className="flex-1 rounded bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeAction(pendingAction)}
                    className="flex-1 rounded bg-purple-600 px-4 py-2 text-sm text-white transition-colors hover:bg-purple-700"
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
