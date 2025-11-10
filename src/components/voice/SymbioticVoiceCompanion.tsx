import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, Sparkles, Loader2, Smile, Meh, Frown, Rocket } from 'lucide-react';
import { useVoiceCompanionStore, CompanionMood } from '../../state/voiceCompanionStore';
import { Portal } from '../common/Portal';

const positiveWords = ['great', 'awesome', 'excited', 'happy', 'love', 'fantastic', 'wonderful'];
const negativeWords = ['frustrated', 'angry', 'annoyed', 'stuck', 'hate', 'upset'];
const urgencyWords = ['plan', 'launch', 'deadline', 'urgent', 'quick', 'fast'];

function detectMood(text: string): CompanionMood {
  const lowered = text.toLowerCase();
  if (negativeWords.some((w) => lowered.includes(w))) {
    return 'concerned';
  }
  if (urgencyWords.some((w) => lowered.includes(w))) {
    return 'motivated';
  }
  if (positiveWords.some((w) => lowered.includes(w))) {
    return 'positive';
  }
  return 'calm';
}

function moodIcon(mood: CompanionMood) {
  switch (mood) {
    case 'positive':
      return <Smile size={16} className="text-emerald-300" />;
    case 'concerned':
      return <Frown size={16} className="text-amber-300" />;
    case 'motivated':
      return <Rocket size={16} className="text-cyan-300" />;
    default:
      return <Meh size={16} className="text-slate-300" />;
  }
}

export function SymbioticVoiceCompanion() {
  const {
    open,
    listening,
    transcript,
    mood,
    messages,
    loadingReply,
    error,
    setOpen,
    setListening,
    setTranscript,
    setMood,
    pushMessage,
    sendToCompanion,
    clearConversation,
    setError,
  } = useVoiceCompanionStore();

  const recogRef = useRef<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognizer = new SR();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';
      recognizer.onresult = (event: any) => {
        const interim = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join(' ');
        setTranscript(interim);
        if (event.results[0].isFinal) {
          const finalText = interim.trim();
          const detectedMood = detectMood(finalText);
          setMood(detectedMood);
          setTranscript('');
          setListening(false);
          void sendToCompanion(finalText, detectedMood);
        }
      };
      recognizer.onerror = (e: any) => {
        setListening(false);
        setError(e?.error ?? 'Voice recognition error');
      };
      recognizer.onend = () => {
        setListening(false);
      };
      recogRef.current = recognizer;
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
    }
  }, [setListening, setTranscript, setMood, sendToCompanion, setError]);

  const startListening = () => {
    if (!speechSupported || !recogRef.current) {
      setError('Speech recognition not available in this environment.');
      return;
    }
    try {
      setError(null);
      setTranscript('');
      setListening(true);
      recogRef.current.start();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recogRef.current && listening) {
      try {
        recogRef.current.stop();
      } catch {}
    }
    setListening(false);
  };

  const moodLabel = useMemo(() => {
    switch (mood) {
      case 'positive':
        return 'Upbeat';
      case 'concerned':
        return 'Checking in';
      case 'motivated':
        return 'In the zone';
      default:
        return 'Calm';
    }
  }, [mood]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-100 transition-colors hover:bg-purple-500/20`}
        title="Open Symbiotic Voice Companion"
      >
        <Sparkles size={14} /> Voice Companion
      </button>

      <AnimatePresence>
        {open && (
          <Portal>
            <div className="fixed inset-0 z-[120] flex items-end justify-end bg-transparent pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto m-6 w-[360px] max-w-[92vw] rounded-3xl border border-purple-400/30 bg-slate-950/96 p-4 shadow-[0_20px_80px_rgba(124,58,237,0.35)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-purple-200/80">Symbiotic Companion</div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-100">
                      {moodIcon(mood)} {moodLabel}
                    </div>
                    <div className="text-[11px] text-purple-200/60">Speak your mind and Symbiotic will respond empathetically.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearConversation}
                      className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-100 hover:bg-purple-500/20"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopListening();
                        setOpen(false);
                      }}
                      className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-100 hover:bg-purple-500/20"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-4 h-48 overflow-y-auto rounded-2xl border border-purple-500/10 bg-slate-900/60 p-3">
                  {messages.length === 0 && !transcript ? (
                    <div className="text-[11px] text-purple-200/70">
                      Tap the mic to start talking. I can help summarize, brainstorm, or keep you focused.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 text-[11px]">
                      {messages.map((message) => (
                        <div
                          key={`${message.role}-${message.timestamp}`}
                          className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end text-right' : 'items-start text-left'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                              message.role === 'user'
                                ? 'bg-purple-500/20 text-purple-100'
                                : 'bg-slate-800/70 text-purple-50'
                            }`}
                          >
                            {message.text}
                          </div>
                        </div>
                      ))}
                      {transcript && (
                        <div className="flex justify-end text-[11px] text-purple-200/70">
                          {transcript}
                        </div>
                      )}
                      {loadingReply && (
                        <div className="flex items-center gap-2 text-[11px] text-purple-200/70">
                          <Loader2 size={14} className="animate-spin" />
                          Formulating a response…
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-100">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-purple-200/70">
                    {speechSupported ? 'Ready for voice input.' : 'Voice capture not available.'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={listening ? stopListening : startListening}
                      disabled={!speechSupported}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
                        listening
                          ? 'bg-red-500/30 text-red-100 border border-red-500/40'
                          : 'bg-purple-500/20 text-purple-100 border border-purple-400/30 hover:bg-purple-500/30'
                      } ${speechSupported ? '' : 'opacity-60 cursor-not-allowed'}`}
                    >
                      {listening ? <MicOff size={14} /> : <Mic size={14} />}
                      {listening ? 'Stop listening' : 'Start listening'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
}
