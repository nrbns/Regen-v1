// @ts-nocheck

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, StopCircle, Copy, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { ipcEvents } from '../lib/ipc-events';
import { useAgentStreamStore } from '../state/agentStreamStore';
import { trackAgent } from '../core/supermemory/tracker';

export default function AgentConsole() {
  const [runId, setRunId] = useState<string | null>(null);
  const [_logs, setLogs] = useState<any[]>([]);
  const [streamingText, setStreamingText] = useState<string>('');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const responsePaneRef = useRef<HTMLDivElement | null>(null);
  const dslRef = useRef<string>(JSON.stringify({ goal: "Open example.com", steps: [{ skill: 'navigate', args: { url: 'https://example.com' } }], output: { type: 'json', schema: {} } }, null, 2));
  
  const { status, transcript, events, setRun, setStatus, appendTranscript, reset } = useAgentStreamStore();

  // Auto-scroll response pane to bottom when new content arrives
  useEffect(() => {
    if (responsePaneRef.current && (streamingText || transcript)) {
      responsePaneRef.current.scrollTop = responsePaneRef.current.scrollHeight;
    }
  }, [streamingText, transcript]);

  // Listen for agent tokens and steps
  useEffect(() => {
    if (!window.agent) return;
    
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
    
    window.agent.onToken(tokenHandler);
    window.agent.onStep(stepHandler);
    
    return () => {
      // Cleanup handled by component unmount
    };
  }, [appendTranscript]);

  // Listen for streaming AI chunks
  useEffect(() => {
    if (!streamId) return;

    const streamChunkHandler = (data: { streamId: string; chunk: { text?: string; finished?: boolean } }) => {
      if (data.streamId === streamId) {
        if (data.chunk.text) {
          setStreamingText(prev => prev + (data.chunk.text || ''));
          appendTranscript(data.chunk.text || '');
        }
        if (data.chunk.finished) {
          setIsStreaming(false);
          setStreamId(null);
          setStatus('complete');
        }
      }
    };

    const streamErrorHandler = (data: { streamId: string; error: string }) => {
      if (data.streamId === streamId) {
        setIsStreaming(false);
        setStreamId(null);
        setStatus('error');
        useAgentStreamStore.getState().setError(data.error);
      }
    };

    const unsubscribeChunk = ipcEvents.on<{ streamId: string; chunk: { text?: string; finished?: boolean } }>('agent:stream:chunk', streamChunkHandler);
    const unsubscribeDone = ipcEvents.on<{ streamId: string }>('agent:stream:done', (data) => {
      if (data.streamId === streamId) {
        setIsStreaming(false);
        setStreamId(null);
        setStatus('complete');
      }
    });
    const unsubscribeError = ipcEvents.on<{ streamId: string; error: string }>('agent:stream:error', streamErrorHandler);
    
    return () => {
      unsubscribeChunk();
      unsubscribeDone();
      unsubscribeError();
    };
  }, [streamId, appendTranscript, setStatus]);

  const handleStartStream = useCallback(async () => {
    if (!query.trim() || isStreaming) return;
    
    try {
      setStreamingText('');
      reset();
      setIsStreaming(true);
      setStatus('connecting');
      
      // Track agent action
      try {
        await trackAgent('stream_start', {
          action: query.trim(),
          skill: 'stream',
        });
      } catch (error) {
        console.warn('[AgentConsole] Failed to track agent action:', error);
      }
      
      const result = await ipc.agent.stream.start(query.trim(), {
        model: 'llama3.2',
        temperature: 0.7,
      });
      
      if (result?.streamId) {
        setStreamId(result.streamId);
        setRun(result.streamId, query.trim());
        setStatus('live');
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
      setIsStreaming(false);
      setStatus('error');
      useAgentStreamStore.getState().setError(error instanceof Error ? error.message : String(error));
      
      // Track error
      try {
        await trackAgent('stream_error', {
          action: query.trim(),
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (err) {
        // Ignore tracking errors
      }
    }
  }, [query, isStreaming, reset, setStatus, setRun]);

  const handleStopStream = useCallback(async () => {
    if (!streamId) return;
    try {
      await ipc.agent.stream.stop(streamId);
      setIsStreaming(false);
      setStreamId(null);
      setStatus('complete');
    } catch (error) {
      console.error('Failed to stop stream:', error);
    }
  }, [streamId, setStatus]);

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
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Ask Redix</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
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
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-500/60 bg-blue-500/20 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="h-48 w-full rounded-lg border border-slate-700/60 bg-slate-800/70 p-3 text-xs font-mono text-gray-200 focus:border-blue-500/60 focus:outline-none"
                defaultValue={dslRef.current}
                onChange={(e) => (dslRef.current = e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-indigo-500/60 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-100 transition hover:bg-indigo-500/30"
                  onClick={async () => {
                    try {
                      const parsed = JSON.parse(dslRef.current);
                      const res = await window.agent?.start?.(parsed) as any;
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
                    }
                  }}
                >
                  Start Run
                </button>
                <button
                  className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-slate-800/80"
                  onClick={async () => {
                    if (runId) await window.agent?.stop?.(runId);
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
                  {events.slice(-5).reverse().map((event) => (
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
                  className="prose prose-invert prose-sm max-w-none"
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                    {streamingText || transcript}
                    {isStreaming && (
                      <motion.span
                        className="ml-1 inline-block h-4 w-0.5 bg-blue-400"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
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
                  <p className="mt-4 text-sm text-gray-400">Ask a question to see streaming AI responses</p>
                  <p className="mt-1 text-xs text-gray-500">Responses stream in real-time as they're generated</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}


