// @ts-nocheck

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, StopCircle, Copy, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { AIThinkingSkeleton } from '../components/common/LoadingSkeleton';
import { aiEngine, type AITaskResult } from '../core/ai';
import { createFastCharStream } from '../core/ai/streamEnhancer';
import { withDeterminism, extractConfidence, extractSources } from '../core/ai/withDeterminism';
import { getUserId } from '../utils/getUserId';
import { MemoryStoreInstance } from '../core/supermemory/store';
import { semanticSearchMemories } from '../core/supermemory/search';
import { useAgentStreamStore } from '../state/agentStreamStore';
import { useAgentMemoryStore } from '../state/agentMemoryStore';
// import { getLast5Turns, buildContextualPrompt, getConversationContext } from '../core/agents/contextMemory'; // Unused
import { trackAgent, trackAction } from '../core/supermemory/tracker';
import {
  startAutoSave,
  stopAutoSave,
  saveLoopState,
  checkForCrashedLoops,
} from '../core/agents/loopResume';
import { useSettingsStore } from '../state/settingsStore';
import { AgentModeSelector } from '../components/integrations/AgentModeSelector';
import { multiAgentSystem, type AgentMode } from '../core/agents/multiAgentSystem';
import { useTabsStore } from '../state/tabsStore';
import { AgentStagehandIntegration } from './AgentConsole/stagehand-integration';
import { toast } from '../utils/toast';
import { AgentSuggestions, generateAgentSuggestions } from '../components/agent/AgentSuggestions';
import { isMVPFeatureEnabled } from '../config/mvpFeatureFlags';

export default function AgentConsole() {
  const [runId, setRunId] = useState<string | null>(null);
  const [_logs, setLogs] = useState<any[]>([]);
  const [streamingText, setStreamingText] = useState<string>('');
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const responsePaneRef = useRef<HTMLDivElement | null>(null);
  const dslRef = useRef<string>(
    JSON.stringify(
      {
        goal: 'Open example.com',
        steps: [{ skill: 'navigate', args: { url: 'https://example.com' } }],
        output: { type: 'json', schema: {} },
      },
      null,
      2
    )
  );
  const streamMetaRef = useRef<{
    startedAt: number;
    query: string;
    model?: string;
    provider?: string;
  } | null>(null);
  const latestOutputRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    status,
    transcript,
    events,
    setRun,
    setStatus,
    appendTranscript,
    reset,
    runId: _currentRunId,
  } = useAgentStreamStore();
  const language = useSettingsStore(state => state.language || 'auto');
  const agentConsoleHistory = useAgentMemoryStore(state =>
    state.entries.filter(entry => entry.agentId === 'agent.console').slice(0, 5)
  );
  const [selectedAgentMode, setSelectedAgentMode] = useState<AgentMode>('research');
  const { activeId, tabs } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeId);

  // Check for crashed loops on mount
  useEffect(() => {
    const crashed = checkForCrashedLoops();
    if (crashed.length > 0) {
      console.log('[AgentConsole] Found', crashed.length, 'crashed loops');
      // Could show a toast or modal here to offer resume
    }
  }, []);

  // Cleanup auto-save on unmount
  useEffect(() => {
    return () => {
      stopAutoSave();
    };
  }, []);

  // Auto-scroll response pane to bottom when new content arrives
  useEffect(() => {
    if (responsePaneRef.current && (streamingText || transcript)) {
      responsePaneRef.current.scrollTop = responsePaneRef.current.scrollHeight;
    }
  }, [streamingText, transcript]);

  useEffect(() => {
    latestOutputRef.current = streamingText || transcript || '';
  }, [streamingText, transcript]);

  // AUTOMATION INTEGRATION: Listen for automation execution events from PlaybookForge
  useEffect(() => {
    const handleAutomationExecute = ((e: CustomEvent) => {
      const { runId: execRunId, dsl } = e.detail;
      if (dsl) {
        // Set the DSL and trigger execution
        dslRef.current = JSON.stringify(dsl, null, 2);
        setQuery(dsl.goal || 'Execute automation');

        // Import and use automation bridge to track status
        import('../services/automationBridge').then(({ updateAutomationStatus }) => {
          updateAutomationStatus(execRunId, { progress: 10 });
        });

        // Start the agent execution
        setTimeout(() => {
          handleStartStream();
        }, 100);
      }
    }) as EventListener;

    const handleAutomationCancel = (() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsStreaming(false);
        setStatus('idle');
      }
    }) as EventListener;

    window.addEventListener('agent:execute', handleAutomationExecute);
    window.addEventListener('agent:cancel', handleAutomationCancel);

    return () => {
      window.removeEventListener('agent:execute', handleAutomationExecute);
      window.removeEventListener('agent:cancel', handleAutomationCancel);
    };
  }, [handleStartStream, setStatus]);

  const finalizeTelemetry = useCallback(
    (
      status: 'success' | 'error' | 'cancelled',
      extras?: {
        error?: string;
        provider?: string;
        model?: string;
        promptTokens?: number | null;
        completionTokens?: number | null;
        totalTokens?: number | null;
      }
    ) => {
      const meta = streamMetaRef.current;
      if (!meta) return;
      const latencyMs = Math.round(performance.now() - meta.startedAt);
      trackAction(`agent_stream_${status}`, {
        source: 'AgentConsole',
        queryLength: meta.query.length,
        latencyMs,
        provider: extras?.provider ?? meta.provider ?? 'unknown',
        model: extras?.model ?? meta.model ?? 'unknown',
        promptTokens: extras?.promptTokens ?? undefined,
        completionTokens: extras?.completionTokens ?? undefined,
        totalTokens: extras?.totalTokens ?? undefined,
        outputChars: latestOutputRef.current.length || undefined,
        error: extras?.error,
      }).catch(() => {});
      streamMetaRef.current = null;
    },
    []
  );

  const persistConsoleMemory = useCallback(
    async (payload: {
      prompt: string;
      runId: string;
      success: boolean;
      response?: string;
      error?: string;
      usage?: AITaskResult['usage'];
      durationMs?: number;
    }) => {
      try {
        useAgentMemoryStore.getState().addEntry({
          agentId: 'agent.console',
          runId: payload.runId,
          prompt: payload.prompt,
          response: payload.response,
          error: payload.error,
          success: payload.success,
          tokens: payload.usage
            ? {
                prompt: payload.usage.prompt_tokens ?? null,
                completion: payload.usage.completion_tokens ?? null,
                total: payload.usage.total_tokens ?? null,
              }
            : undefined,
        });
      } catch (error) {
        console.warn('[AgentConsole] Failed to update agent memory store:', error);
      }

      if (typeof window === 'undefined') {
        return;
      }

      try {
        await MemoryStoreInstance.saveEvent({
          type: 'agent',
          value: payload.response || payload.error || payload.prompt,
          metadata: {
            action: payload.prompt,
            runId: payload.runId,
            skill: 'agent.console',
            result: payload.response,
            error: payload.error,
            duration: payload.durationMs,
            tokensUsed: payload.usage?.total_tokens ?? undefined,
            promptTokens: payload.usage?.prompt_tokens,
            completionTokens: payload.usage?.completion_tokens,
            success: payload.success,
          },
        });
      } catch (error) {
        console.warn('[AgentConsole] Failed to persist console memory:', error);
      }
    },
    []
  );

  const clearConsoleHistory = useCallback(() => {
    try {
      useAgentMemoryStore.getState().clearAgent('agent.console');
    } catch (error) {
      console.warn('[AgentConsole] Failed to clear agent console history:', error);
    }
  }, []);

  // Listen for agent tokens and steps
  useEffect(() => {
    if (typeof window === 'undefined' || !window.agent) {
      console.warn('[AgentConsole] window.agent not available');
      return;
    }

    const tokenHandler = (t: any) => {
      setLogs((l: any[]) => [...l, t]);
      if (t.type === 'token' && t.text) {
        appendTranscript(t.text);
      }
    };
    const stepHandler = async (s: any) => {
      setLogs((l: any[]) => [...l, s]);
      useAgentStreamStore.getState().appendEvent({
        id: `event_${Date.now()}_${Math.random()}`,
        type: 'step',
        step: s.idx,
        status: s.skill,
        content: s.res ? JSON.stringify(s.res) : undefined,
        timestamp: Date.now(),
      });

      // Track agent step
      try {
        await trackAgent('step_complete', {
          runId: runId || undefined,
          skill: s.skill,
          step: s.idx,
          result: s.res ? JSON.stringify(s.res).substring(0, 200) : undefined, // Truncate for storage
        });
      } catch (error) {
        console.warn('[AgentConsole] Failed to track agent step:', error);
      }
    };

    try {
      window.agent.onToken(tokenHandler);
      window.agent.onStep(stepHandler);
    } catch (error) {
      console.error('[AgentConsole] Failed to register agent handlers:', error);
    }

    return () => {
      // Cleanup handled by component unmount
    };
  }, [appendTranscript, runId]);

  const handleStartStream = useCallback(async () => {
    // Prevent UI-triggered agent starts when running v1-mode
    if (isV1ModeEnabled()) {
      toast.info('Agent execution is disabled in v1-mode for stability');
      return;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery || isStreaming) return;

    reset();
    setStreamingText('');
    setIsStreaming(true);
    setStatus('connecting');
    const controller = new AbortController();
    abortControllerRef.current = controller;
    streamMetaRef.current = { startedAt: performance.now(), query: trimmedQuery };

    const runToken = `agent-stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setRun(runToken, trimmedQuery, activeId);

    // Phase 2: Use multi-agent system
    try {
      const agentResult = await multiAgentSystem.execute(selectedAgentMode, trimmedQuery, {
        mode: selectedAgentMode,
        tabId: activeId,
        url: activeTab?.url,
        sessionId: activeTab?.sessionId,
      });

      // Execute actions if any
      if (agentResult.actions && agentResult.actions.length > 0) {
        // Actions will be executed by safe executor
        console.log('[AgentConsole] Agent generated actions:', agentResult.actions);
      }
    } catch (error) {
      console.error('[AgentConsole] Multi-agent execution failed:', error);
      // Continue with existing flow as fallback
    }

    // Start auto-save for loop resume
    startAutoSave({
      language,
      mode: 'agent',
    });

    // Track agent action
    try {
      await trackAgent('stream_start', {
        action: trimmedQuery,
        skill: 'stream',
      });
    } catch (error) {
      console.warn('[AgentConsole] Failed to track agent action:', error);
    }

    // Build enhanced context with recent runs and relevant memories
    const context: any = {
      mode: 'agent-console',
    };

    // Add recent agent runs
    if (agentConsoleHistory.length > 0) {
      context.agent_runs = agentConsoleHistory.slice(0, 3).map(entry => ({
        prompt: entry.prompt,
        response: entry.response,
        success: entry.success,
        error: entry.error,
        createdAt: entry.createdAt,
      }));
    }

    // Fetch relevant memories for context
    let relevantMemories: any[] = [];
    try {
      const memoryMatches = await semanticSearchMemories(trimmedQuery, {
        limit: 5,
        minSimilarity: 0.6,
      });
      relevantMemories = memoryMatches.map(m => ({
        value: m.event.value,
        metadata: m.event.metadata,
        id: m.event.id,
        type: m.event.type,
        similarity: m.similarity,
      }));
    } catch (error) {
      console.warn('[AgentConsole] Failed to fetch memory context:', error);
    }

    if (relevantMemories.length > 0) {
      context.memories = relevantMemories;
    }

    try {
      let finalResult: AITaskResult | null = null;
      let streamError: string | null = null;
      let sawFirstToken = false;

      // DETERMINISM: Wrap AI operation with determinism (job creation, Event Ledger logging)
      const userId = getUserId();
      const deterministicRunner = withDeterminism(aiEngine.runTask.bind(aiEngine), {
        userId,
        type: 'agent',
        query: trimmedQuery,
        reasoning: `Agent console query: ${trimmedQuery.substring(0, 100)}`,
        sources: context.memories
          ? context.memories.map((m: any) => m.id || m.content?.substring(0, 50))
          : [],
      });

      try {
        await deterministicRunner(
          {
            kind: 'agent',
            prompt: trimmedQuery,
            context,
            mode: 'agent-console',
            metadata: { surface: 'agent-console' },
            llm: {
              provider: 'ollama', // Default to Ollama for offline support
              model: 'phi3:mini',
              temperature: 0.2,
              maxTokens: 900,
            },
            stream: true,
            signal: controller.signal,
          },
          createFastCharStream(
            (char, accumulated) => {
              if (!sawFirstToken) {
                sawFirstToken = true;
                setStatus('live');
              }
              setStreamingText(accumulated);
              // Append to transcript character by character for smoother updates
              if (char) {
                appendTranscript(char);
              }
            },
            fullText => {
              finalResult = { text: fullText, provider: 'ollama', model: 'phi3:mini' };
              setStreamingText(fullText);

              // Extract confidence and sources from result for enhanced logging
              if (finalResult) {
                const _confidence = extractConfidence(finalResult);
                const _sources = extractSources(finalResult);
                // These are already logged by withDeterminism, but available here if needed
              }
            },
            error => {
              streamError =
                typeof error === 'string' ? error : error?.message || 'AI agent error occurred';
              console.error('[AgentConsole] Stream error:', error);
            }
          )
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        streamError = errorMessage;
        console.error('[AgentConsole] Task execution error:', error);
      }

      abortControllerRef.current = null;

      if (controller.signal.aborted) {
        setIsStreaming(false);
        finalizeTelemetry('cancelled');
        return;
      }

      if (streamError) {
        const durationMs = streamMetaRef.current
          ? Math.round(performance.now() - streamMetaRef.current.startedAt)
          : undefined;
        await persistConsoleMemory({
          prompt: trimmedQuery,
          runId: runToken,
          success: false,
          error: streamError,
          response: latestOutputRef.current || streamingText || undefined,
          durationMs,
        });
        setIsStreaming(false);
        setStatus('error');
        useAgentStreamStore.getState().setError(streamError);
        // Save loop state on error
        saveLoopState({
          mode: 'agent',
          metadata: { language },
        });
        stopAutoSave();
        finalizeTelemetry('error', { error: streamError });

        // AUTOMATION INTEGRATION: Notify automation bridge of error
        import('../services/automationBridge')
          .then(({ completeAutomation }) => {
            completeAutomation(runToken, undefined, streamError);
          })
          .catch(() => {
            // Automation bridge not available
          });
        return;
      }

      const finalOutput = finalResult?.text ?? latestOutputRef.current ?? streamingText ?? '';
      const durationMs = streamMetaRef.current
        ? Math.round(performance.now() - streamMetaRef.current.startedAt)
        : undefined;

      // Save final loop state
      saveLoopState({
        mode: 'agent',
        status: 'complete',
        metadata: { language },
      });
      stopAutoSave();

      await persistConsoleMemory({
        prompt: trimmedQuery,
        runId: runToken,
        success: true,
        response: finalOutput,
        usage: finalResult?.usage,
        durationMs,
      });
      setIsStreaming(false);
      setStatus('complete');
      finalizeTelemetry('success', {
        provider: finalResult?.provider,
        model: finalResult?.model,
        promptTokens: finalResult?.usage?.prompt_tokens ?? null,
        completionTokens: finalResult?.usage?.completion_tokens ?? null,
        totalTokens: finalResult?.usage?.total_tokens ?? null,
      });

      // AUTOMATION INTEGRATION: Notify automation bridge of completion
      import('../services/automationBridge')
        .then(({ completeAutomation }) => {
          completeAutomation(runToken, { output: finalOutput, result: finalResult });
        })
        .catch(() => {
          // Automation bridge not available
        });
    } catch (error) {
      abortControllerRef.current = null;
      if (controller.signal.aborted) {
        finalizeTelemetry('cancelled');
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = streamMetaRef.current
        ? Math.round(performance.now() - streamMetaRef.current.startedAt)
        : undefined;
      await persistConsoleMemory({
        prompt: trimmedQuery,
        runId: runToken,
        success: false,
        error: message,
        response: latestOutputRef.current || streamingText || undefined,
        durationMs,
      });
      setIsStreaming(false);
      setStatus('error');
      useAgentStreamStore.getState().setError(message);
      finalizeTelemetry('error', { error: message });

      try {
        await trackAgent('stream_error', {
          action: trimmedQuery,
          error: message,
        });
      } catch {
        // Ignore tracking errors
      }
    }
  }, [
    query,
    isStreaming,
    reset,
    setStatus,
    setRun,
    appendTranscript,
    finalizeTelemetry,
    agentConsoleHistory,
  ]);

  const handleStopStream = useCallback(() => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setStatus('complete');
  }, [setStatus]);

  const handleCopyResponse = useCallback(async () => {
    const textToCopy = streamingText || transcript;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [streamingText, transcript]);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-2">
            <Bot size={20} className="text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-100">Agent Console</h1>
            <p className="text-xs text-gray-400">Stream AI responses and manage agent runs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'live' && (
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Streaming
            </motion.span>
          )}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Input & Controls */}
        <div className="flex flex-col gap-4">
          {/* Phase 2: Agent Mode Selector */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">Agent Mode</label>
            <AgentModeSelector
              defaultMode={selectedAgentMode}
              onAgentSelect={(mode, capabilities) => {
                setSelectedAgentMode(mode);
                console.log('[AgentConsole] Selected agent:', mode, 'Capabilities:', capabilities);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Ask Redix</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="agent-console-query"
                  name="agent-console-query"
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
                      e.preventDefault();
                      void handleStartStream();
                    }
                  }}
                  placeholder="Ask anything... (e.g., 'summarize quantum computing trends')"
                  disabled={isStreaming}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-800/70 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50"
                />
                {isStreaming && (
                  <motion.div
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={16} className="text-blue-400" />
                  </motion.div>
                )}
              </div>
              {isStreaming ? (
                <motion.button
                  onClick={handleStopStream}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/60 bg-red-500/20 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/30"
                >
                  <StopCircle size={16} />
                  Stop
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleStartStream}
                  disabled={!query.trim()}
                  whileHover={{ scale: query.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: query.trim() ? 0.95 : 1 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-500/60 bg-blue-500/20 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={16} />
                  Send
                </motion.button>
              )}
            </div>
          </div>

          {/* Agent DSL Editor (Collapsible) */}
          <details className="rounded-xl border border-slate-700/60 bg-slate-900/40">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100">
              Advanced: Agent DSL
            </summary>
            <div className="border-t border-slate-700/60 p-4">
              <textarea
                id="agent-dsl-editor"
                name="agent-dsl"
                className="h-48 w-full rounded-lg border border-slate-700/60 bg-slate-800/70 p-3 font-mono text-xs text-gray-200 focus:border-blue-500/60 focus:outline-none"
                defaultValue={dslRef.current}
                onChange={e => (dslRef.current = e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-indigo-500/60 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-100 transition hover:bg-indigo-500/30"
                  onClick={async () => {
                    if (typeof window === 'undefined' || !window.agent) {
                      // Fallback to multi-agent system
                      try {
                        const agentResult = await multiAgentSystem.execute(
                          selectedAgentMode,
                          dslRef.current,
                          {
                            mode: selectedAgentMode,
                            tabId: activeId,
                            url: activeTab?.url,
                            sessionId: activeTab?.sessionId,
                          }
                        );
                        if (agentResult.runId) {
                          setRunId(agentResult.runId);
                          toast.success('Agent run started');
                        }
                      } catch (error: any) {
                        console.error('[AgentConsole] Fallback execution failed:', error);
                        alert(
                          `Agent API not available. Error: ${error?.message || 'Unknown error'}`
                        );
                      }
                      return;
                    }
                    try {
                      const parsed = JSON.parse(dslRef.current);
                      const res = (await window.agent.start(parsed)) as any;
                      if (res?.runId) {
                        setRunId(res.runId);

                        // Track agent run start
                        try {
                          await trackAgent('run_start', {
                            runId: res.runId,
                            skill: parsed.goal || 'unknown',
                            action: JSON.stringify(parsed).substring(0, 200),
                          });
                        } catch (error) {
                          console.warn('[AgentConsole] Failed to track agent run:', error);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to start agent run:', error);
                      alert(
                        `Failed to start agent run: ${error instanceof Error ? error.message : String(error)}`
                      );
                    }
                  }}
                >
                  Start Run
                </button>
                <button
                  className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-slate-800/80"
                  onClick={async () => {
                    if (typeof window === 'undefined' || !window.agent) {
                      // Fallback to multi-agent system
                      try {
                        const agentResult = await multiAgentSystem.execute(
                          selectedAgentMode,
                          dslRef.current,
                          {
                            mode: selectedAgentMode,
                            tabId: activeId,
                            url: activeTab?.url,
                            sessionId: activeTab?.sessionId,
                          }
                        );
                        if (agentResult.runId) {
                          setRunId(agentResult.runId);
                          toast.success('Agent run started');
                        }
                      } catch (error: any) {
                        console.error('[AgentConsole] Fallback execution failed:', error);
                        alert(
                          `Agent API not available. Error: ${error?.message || 'Unknown error'}`
                        );
                      }
                      return;
                    }
                    if (runId) {
                      try {
                        if (typeof window !== 'undefined' && window.agent) {
                          await window.agent.stop(runId);
                        }
                        setRunId(null);
                        setIsStreaming(false);
                        toast.success('Agent run stopped');
                      } catch (error) {
                        console.error('Failed to stop agent run:', error);
                        toast.error(
                          `Failed to stop agent run: ${error instanceof Error ? error.message : String(error)}`
                        );
                      }
                    }
                  }}
                >
                  Stop Run
                </button>
              </div>
            </div>
          </details>

          {/* Live Events Timeline */}
          {events.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-gray-300">Recent Events</h3>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <AnimatePresence>
                  {events
                    .slice(-5)
                    .reverse()
                    .map(event => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-lg border border-slate-700/40 bg-slate-800/50 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-200">{event.type}</span>
                          {event.step !== undefined && (
                            <span className="text-gray-400">Step {event.step}</span>
                          )}
                        </div>
                        {event.content && (
                          <p className="mt-1 truncate text-gray-400">{event.content}</p>
                        )}
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Recent Agent Runs */}
          {agentConsoleHistory.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Recent Agent Runs</h3>
                <button
                  className="text-xs text-gray-500 hover:text-gray-300"
                  onClick={clearConsoleHistory}
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {agentConsoleHistory.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setQuery(entry.prompt)}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 text-left transition hover:border-slate-500/60 hover:bg-slate-900/70"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className={entry.success ? 'text-emerald-400' : 'text-rose-400'}>
                        {entry.success ? 'Succeeded' : 'Error'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-gray-200">{entry.prompt}</p>
                    {(entry.response || entry.error) && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                        {(entry.response || entry.error || '').trim()}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Streaming Response Pane */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">Response</h3>
            {(streamingText || transcript) && (
              <button
                onClick={handleCopyResponse}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-xs text-gray-300 transition hover:bg-slate-800/80"
              >
                {copyStatus === 'copied' ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>
          <div
            ref={responsePaneRef}
            className="flex-1 overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
          >
            <AnimatePresence mode="wait">
              {streamingText || transcript ? (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Enhanced Message Bubble */}
                  <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/5 p-5 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full border border-blue-500/40 bg-blue-500/20 p-2">
                        <Bot size={18} className="text-blue-300" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-300">AI Assistant</span>
                          <span className="text-xs text-gray-500">
                            {new Date().toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
                            {streamingText || transcript}
                            {isStreaming && (
                              <motion.span
                                className="ml-1 inline-block h-4 w-0.5 bg-blue-400"
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : isStreaming ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <AIThinkingSkeleton message="AI is processing your request..." />
                  <div className="space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-gray-800/50" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-gray-800/50" />
                    <div className="h-3 w-4/6 animate-pulse rounded bg-gray-800/50" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center"
                >
                  <div className="rounded-full border border-slate-700/60 bg-slate-800/60 p-4">
                    <Sparkles size={24} className="text-slate-500" />
                  </div>
                  <p className="mt-4 text-sm text-gray-400">
                    Ask a question to see streaming AI responses
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Responses stream in real-time as they're generated
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggestions - Show after response completes */}
            {!isStreaming && (streamingText || transcript) && status === 'complete' && (
              <div className="mt-6">
                <AgentSuggestions
                  suggestions={generateAgentSuggestions(query, streamingText || transcript, {
                    mode: selectedAgentMode,
                    url: activeTab?.url,
                  })}
                  onSelect={suggestion => {
                    setQuery(suggestion.text);
                    // Auto-submit if it's a quick action
                    if (suggestion.category === 'quick' || suggestion.category === 'action') {
                      setTimeout(() => {
                        void handleStartStream();
                      }, 100);
                    }
                  }}
                  isLoading={isStreaming}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <AgentStagehandIntegration />
    </div>
  );
}
