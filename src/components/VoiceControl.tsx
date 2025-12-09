import { useEffect, useRef } from 'react';
import { Mic, Square, Loader2, Zap } from 'lucide-react';
import { useAgentStreamStore } from '../state/agentStreamStore';
import { streamAgentTask } from '../services/agenticCore';
import { useAppStore } from '../state/appStore';
import { executeAgentActions } from '../services/agenticActions';

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
    setStatus,
    setTranscript,
    appendStream,
    setActions,
    setError,
    reset,
  } = useAgentStreamStore();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const currentMode = useAppStore(state => state.mode);

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

      await streamAgentTask(text, {
        mode: currentMode,
        onToken: chunk => appendStream(chunk),
        onActions: async acts => {
          setActions(acts);
          await executeAgentActions(acts);
        },
        onDone: () => setStatus('idle'),
        onError: error => {
          setStatus('error');
          setError(
            error instanceof Error ? error.message : 'Agent execution failed'
          );
        },
      });
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort?.();
    };
  }, [
    appendStream,
    currentMode,
    setActions,
    setError,
    setStatus,
    setTranscript,
    status,
  ]);

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
              <div className="text-slate-400">Actions</div>
              <ul className="list-disc space-y-1 pl-4 text-slate-50">
                {actions.map(action => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

