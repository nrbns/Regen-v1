import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  ArrowRight,
  History,
} from 'lucide-react';
import { useVoiceControlStore } from '../../state/agentStreamStore';
import { streamAgentTask } from '../../services/agenticCore';
import { useAppStore } from '../../state/appStore';
import { executeAgentActions } from '../../services/agenticActions';
import { ensureAIModelAvailable } from '../../utils/firstRun';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionHistoryPanel } from '../agent/ActionHistoryPanel';
import { ActionRetryButton } from '../agent/ActionRetryButton';
import { ActionCancelButton } from '../agent/ActionCancelButton';
import { ActionUndoButton } from '../agent/ActionUndoButton';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
};

/**
 * Voice-first entrypoint. Uses the browser SpeechRecognition API when available
 * and streams responses from the local Ollama agent.
 */
export function VoiceControl() {
  const {
    status,
    transcript,
    stream,
    actions,
    actionResults,
    actionProgress,
    setStatus,
    setTranscript,
    appendStream,
    setActions,
    setActionResults,
    setActionProgress,
    clearActionProgress,
    isActionCancelled,
    setError,
    reset,
  } = useVoiceControlStore();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const currentMode = useAppStore(state => state.mode);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition: SpeechRecognitionLike = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setStatus('listening');
      setTranscript('');
      setError(undefined);
    };

    recognition.onend = () => {
      if (status === 'listening') {
        setStatus('idle');
      }
    };

    recognition.onerror = event => {
      setStatus('error');
      setError(event?.error ?? 'Voice recognition error');
    };

    recognition.onresult = async event => {
      const text: string | undefined = event?.results?.[0]?.[0]?.transcript;
      if (!text) {
        setStatus('idle');
        return;
      }

      setTranscript(text);
      setStatus('running');
      setError(undefined);
      appendStream('');
      setActions([]);

      const ready = await ensureAIModelAvailable({
        onProgress: status => setTranscript(`Downloading model… ${status}`),
      });
      if (!ready) {
        setStatus('idle');
        return;
      }

      // Gather context for better agent responses
      const { ipc } = await import('../../lib/ipc-typed');
      const tabs = await ipc.tabs.list().catch(() => []);
      const activeTab = Array.isArray(tabs) ? tabs.find((t: any) => t.active) : null;

      await streamAgentTask(text, {
        mode: currentMode,
        context: {
          activeTabUrl: activeTab?.url,
          activeTabTitle: activeTab?.title,
          tabCount: Array.isArray(tabs) ? tabs.length : 0,
        },
        onToken: chunk => appendStream(chunk),
        onActions: async acts => {
          setActions(acts);
          const results = await executeAgentActions(
            acts,
            (action, progress) => {
              setActionProgress(action, {
                action,
                ...progress,
              });
            },
            isActionCancelled
          );

          // Clear completed actions after a delay
          results.forEach((result, idx) => {
            const action = acts[idx];
            if (result.success) {
              setTimeout(() => clearActionProgress(action), 3000);
            }
          });

          setActionResults(results);
          // Log any failures for user feedback
          const failures = results.filter(r => !r.success);
          if (failures.length > 0 && typeof window !== 'undefined') {
            const { toast } = await import('../../utils/toast');
            failures.forEach(f => {
              toast.error(`Action failed: ${f.action} - ${f.error || 'Unknown error'}`);
            });
          }
        },
        onDone: () => setStatus('idle'),
        onError: error => {
          setStatus('error');
          setError(error instanceof Error ? error.message : 'Agent execution failed');
        },
      });
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort?.();
    };
  }, [appendStream, currentMode, setActions, setError, setStatus, setTranscript, status]);

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('Voice recognition not supported in this browser');
      setStatus('error');
      return;
    }
    reset();
    recognition.start();
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    recognition?.stop();
    setStatus('idle');
  };

  const busy = status === 'listening' || status === 'running';

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 text-xs text-slate-100">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 px-3 py-2 shadow-lg shadow-black/40 backdrop-blur">
          <button
            type="button"
            onClick={busy ? stopListening : startListening}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              busy
                ? 'bg-red-500/90 text-white hover:bg-red-500'
                : 'bg-emerald-600/90 text-white hover:bg-emerald-500'
            }`}
          >
            {busy ? (
              <>
                <Square className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Hey Regen
              </>
            )}
          </button>
          <ActionUndoButton />
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              historyOpen
                ? 'bg-slate-700 text-slate-100'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
            }`}
            title="View action history"
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
          <div className="flex items-center gap-2 text-slate-300">
            {status === 'listening' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                Listening…
              </>
            )}
            {status === 'running' && (
              <>
                <Zap className="h-4 w-4 text-emerald-300" />
                Thinking…
              </>
            )}
            {status === 'error' && <span className="text-amber-400">Error</span>}
          </div>
        </div>

        {(transcript || stream || actions.length > 0) && (
          <div className="space-y-2 rounded-2xl bg-slate-900/85 p-3 shadow-lg shadow-black/40 backdrop-blur">
            {transcript && (
              <div>
                <div className="text-slate-400">You said</div>
                <div className="text-slate-50">{transcript}</div>
              </div>
            )}
            {stream && (
              <div>
                <div className="text-slate-400">Agent</div>
                <div className="whitespace-pre-wrap text-slate-50">{stream}</div>
              </div>
            )}
            {actions.length > 0 && (
              <div>
                <div className="mb-2 text-slate-400">Actions</div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {actions.map((action: string, idx: number) => {
                      const result = actionResults[idx];
                      const progress = actionProgress[action];
                      const success = result?.success ?? null;
                      const actionType = action.match(/\[(\w+)/)?.[1] || 'UNKNOWN';
                      const isRunning =
                        progress?.status === 'running' || progress?.status === 'pending';
                      const isCompleted = progress?.status === 'completed' || success === true;
                      const isFailed = progress?.status === 'failed' || success === false;
                      const isCancelled = progress?.status === 'cancelled';
                      const isCancellable = progress?.cancellable && isRunning;

                      return (
                        <motion.div
                          key={`${action}-${idx}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs ${
                            isCancelled
                              ? 'bg-amber-500/10 text-amber-200'
                              : isCompleted
                                ? 'bg-emerald-500/10 text-emerald-200'
                                : isFailed
                                  ? 'bg-red-500/10 text-red-200'
                                  : 'bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {isCancelled ? (
                              <XCircle className="h-3.5 w-3.5 text-amber-400" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : isFailed ? (
                              <XCircle className="h-3.5 w-3.5 text-red-400" />
                            ) : (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {actionType === 'OPEN' && <ExternalLink className="h-3 w-3" />}
                              {actionType === 'SCRAPE' && <Search className="h-3 w-3" />}
                              {actionType === 'SEARCH' && <Search className="h-3 w-3" />}
                              {actionType === 'TRADE' && <ArrowRight className="h-3 w-3" />}
                              <span className="font-medium">{actionType}</span>
                              {progress?.progress !== undefined && isRunning && (
                                <span className="text-[10px] text-slate-400">
                                  {progress.progress}%
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-slate-400">{action}</div>
                            {progress?.message && (
                              <div className="mt-1 text-[10px] text-slate-400">
                                {progress.message}
                              </div>
                            )}
                            {isRunning && progress?.progress !== undefined && (
                              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-700/50">
                                <motion.div
                                  className="h-full bg-emerald-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress.progress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                            )}
                            <div className="mt-1 flex items-center justify-between gap-2">
                              {result?.error && (
                                <div className="flex-1 text-xs text-red-300">{result.error}</div>
                              )}
                              {isCancellable && (
                                <ActionCancelButton
                                  action={action}
                                  onCancel={() => {
                                    // Progress will be updated by the cancel button
                                  }}
                                />
                              )}
                              {result?.error && result.retryable && !isCancelled && (
                                <ActionRetryButton
                                  action={action}
                                  onRetry={() => {
                                    // Results will be updated by the retry button
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ActionHistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
