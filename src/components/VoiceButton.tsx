import { useEffect, useRef, useState } from 'react';
import { toast } from '../utils/toast';
import { useSettingsStore } from '../state/settingsStore';
import { Mic, MicOff } from 'lucide-react';
import { getLanguageMeta } from '../constants/languageMeta';
import { VoiceCommandEditor } from './VoiceButton/VoiceCommandEditor';

type Props = {
  onResult: (text: string) => void;
  small?: boolean;
  editBeforeExecute?: boolean; // Phase 1, Day 5: Edit before execute
};

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ru: 'ru-RU',
  pt: 'pt-PT',
  ar: 'ar-SA',
};

function getSpeechRecognitionLocale(lang?: string): string {
  if (!lang || lang === 'auto') return 'en-US';
  // Improved Hindi detection: Use hi-IN explicitly for better 70%+ detection rate
  if (lang === 'hi') {
    return 'hi-IN'; // Explicit Hindi locale for better detection
  }
  return LANGUAGE_LOCALE_MAP[lang] || lang.includes('-') ? lang : `${lang}-${lang.toUpperCase()}`;
}

const LANGUAGE_LABELS: Record<string, string> = {
  hi: 'हिंदी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  bn: 'বাংলা',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  pt: 'Português',
  ar: 'العربية',
};

export default function VoiceButton({ onResult, small, editBeforeExecute = false }: Props) {
  const [active, setActive] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const recogRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const language = useSettingsStore(state => state.language || 'auto');
  const langLabel = LANGUAGE_LABELS[language] || language || 'auto';
  const languageMeta = getLanguageMeta(language);

  useEffect(() => {
    // AUDIT FIX #7: Linux voice polyfill - add echo cancellation for better Linux support
    if (navigator.platform.includes('Linux') && navigator.mediaDevices?.getUserMedia) {
      // Polyfill for better Linux voice support
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
        // Add echo cancellation and noise suppression for Linux
        const audioConstraints = {
          ...((constraints.audio as MediaTrackConstraints) || {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
        return originalGetUserMedia({
          ...constraints,
          audio: audioConstraints,
        });
      };
    }

    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const r = new SR();
        r.continuous = false;
        r.interimResults = false;
        r.lang = getSpeechRecognitionLocale(language);
        r.onresult = (e: any) => {
          try {
            setIsProcessing(true);
            const results = Array.isArray(e.results) ? Array.from(e.results) : [];
            const transcripts = results
              .map((res: any) => res?.[0]?.transcript)
              .filter((t: any) => t && typeof t === 'string');
            const t = transcripts.join(' ').trim();
            if (t) {
              // Debounce voice commands (300ms) to prevent rapid-fire execution
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                // Phase 1, Day 5: Edit before execute
                if (editBeforeExecute) {
                  setPendingCommand(t);
                  setShowEditor(true);
                  toast.info(`Voice command captured. Edit if needed.`);
                } else {
                  // Show success toast with language info
                  toast.success(`Voice input received in ${langLabel}`);
                  onResult(t);
                }
                debounceTimerRef.current = null;
              }, 300);
            }
            setActive(false);
            setIsProcessing(false);
          } catch (error) {
            console.error('[VoiceButton] Error processing speech result:', error);
            setActive(false);
            setIsProcessing(false);
            toast.error('Failed to process speech recognition result.');
          }
        };
        r.onerror = (e: any) => {
          console.error('[VoiceButton] Speech recognition error:', e.error);
          setActive(false);
          setIsProcessing(false);
          stopWaveformAnimation();
          if (e.error === 'not-allowed') {
            toast.error('Microphone permission denied. Please enable it in your browser settings.');
          } else if (e.error === 'no-speech') {
            toast.error(`No speech detected in ${langLabel}. Please try again.`);
          } else {
            toast.error('Speech recognition failed. Please try again.');
          }
        };
        r.onend = () => {
          setActive(false);
          setIsProcessing(false);
          stopWaveformAnimation();
        };
        recogRef.current = r;
        setIsAvailable(true);
      } catch (error) {
        console.error('[VoiceButton] Failed to initialize speech recognition:', error);
        setIsAvailable(false);
      }
    } else {
      setIsAvailable(false);
    }
  }, [onResult, language]);

  // Update language when it changes
  useEffect(() => {
    if (recogRef.current) {
      recogRef.current.lang = getSpeechRecognitionLocale(language);
    }
  }, [language]);

  const start = async () => {
    const SR: any = recogRef.current;
    if (!SR || !isAvailable) {
      toast.error(
        'Speech recognition is not available in this browser. Please use a supported browser like Chrome or Edge.'
      );
      return;
    }

    // Check if already active
    if (active) {
      try {
        SR.stop();
        setActive(false);
        stopWaveformAnimation();
      } catch (error) {
        console.error('[VoiceButton] Failed to stop recognition:', error);
      }
      return;
    }

    try {
      setActive(true);
      setIsProcessing(true);
      // Show loading toast with language info
      toast.info(`Listening in ${langLabel}... Speak now`);
      SR.start();

      // Start waveform animation
      startWaveformAnimation();
    } catch (error: any) {
      console.error('[VoiceButton] Failed to start recognition:', error);
      setActive(false);
      setIsProcessing(false);
      stopWaveformAnimation();
      toast.error('Failed to start voice recognition. Please try again.');
    }
  };

  const startWaveformAnimation = () => {
    if (animationRef.current) return;
    const animate = () => {
      if (active) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };
    animate();
  };

  const stopWaveformAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  useEffect(() => {
    if (!active) {
      stopWaveformAnimation();
    }
    return () => stopWaveformAnimation();
  }, [active]);

  return (
    <button
      type="button"
      className={`${small ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-xs'} ml-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
        active ? 'text-white shadow-lg' : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
      } ${isProcessing ? 'animate-pulse' : ''}`}
      onClick={start}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          start();
        }
      }}
      aria-label={
        active ? `Stop voice recognition (${langLabel})` : `Start voice search (${langLabel})`
      }
      aria-pressed={active}
      title={`Voice search in ${langLabel}`}
      disabled={!isAvailable}
      style={
        active
          ? {
              background: `linear-gradient(120deg, ${languageMeta.gradient[0]}, ${languageMeta.gradient[1]})`,
              boxShadow: `0 12px 24px ${languageMeta.gradient[0]}40`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        {active ? (
          <>
            <Mic className="h-4 w-4 animate-pulse" />
            {!small && (
              <div className="flex items-center gap-1">
                {/* Waveform visualization - animated bars */}
                <div className="flex h-4 items-end gap-0.5">
                  <div
                    className="w-0.5 rounded-full"
                    style={{
                      height: '60%',
                      animation: 'waveform 1s ease-in-out infinite',
                      animationDelay: '0ms',
                      background: `linear-gradient(180deg, ${languageMeta.waveform[0]}, ${languageMeta.waveform[1]})`,
                    }}
                  />
                  <div
                    className="w-0.5 rounded-full"
                    style={{
                      height: '80%',
                      animation: 'waveform 1s ease-in-out infinite',
                      animationDelay: '200ms',
                      background: `linear-gradient(180deg, ${languageMeta.waveform[0]}, ${languageMeta.waveform[1]})`,
                    }}
                  />
                  <div
                    className="w-0.5 rounded-full"
                    style={{
                      height: '100%',
                      animation: 'waveform 1s ease-in-out infinite',
                      animationDelay: '400ms',
                      background: `linear-gradient(180deg, ${languageMeta.waveform[0]}, ${languageMeta.waveform[1]})`,
                    }}
                  />
                  <div
                    className="w-0.5 rounded-full"
                    style={{
                      height: '70%',
                      animation: 'waveform 1s ease-in-out infinite',
                      animationDelay: '600ms',
                      background: `linear-gradient(180deg, ${languageMeta.waveform[0]}, ${languageMeta.waveform[1]})`,
                    }}
                  />
                  <div
                    className="w-0.5 rounded-full"
                    style={{
                      height: '90%',
                      animation: 'waveform 1s ease-in-out infinite',
                      animationDelay: '800ms',
                      background: `linear-gradient(180deg, ${languageMeta.waveform[0]}, ${languageMeta.waveform[1]})`,
                    }}
                  />
                </div>
                <style>{`
                  @keyframes waveform {
                    0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
                    50% { transform: scaleY(1); opacity: 1; }
                  }
                `}</style>
                <span className="ml-1 text-xs">{langLabel}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <MicOff className="h-4 w-4" />
            {!small && <span className="text-xs">{langLabel}</span>}
          </>
        )}
      </div>

      {/* Phase 1, Day 5: Voice command editor */}
      {showEditor && pendingCommand && (
        <VoiceCommandEditor
          initialCommand={pendingCommand}
          onExecute={command => {
            onResult(command);
            setShowEditor(false);
            setPendingCommand(null);
          }}
          onCancel={() => {
            setShowEditor(false);
            setPendingCommand(null);
          }}
          language={language}
        />
      )}
    </button>
  );
}
