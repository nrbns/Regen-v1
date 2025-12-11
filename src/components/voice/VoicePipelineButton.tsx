/**
 * Voice Pipeline Button Component
 * Phase 2, Day 4: Hindi + English Full Voice Pipeline
 * Enhanced voice button with full pipeline support
 */

import { useEffect, useRef, useState } from 'react';
// import { motion } from 'framer-motion'; // Unused
import { Mic, MicOff, Volume2, VolumeX, Languages } from 'lucide-react';
import { getVoicePipeline, type VoiceLanguage } from '../../services/voice/voicePipeline';
import { useSettingsStore } from '../../state/settingsStore';
import { getLanguageMeta } from '../../constants/languageMeta';
import { toast } from '../../utils/toast';
import { VoiceCommandEditor } from './VoiceCommandEditor';

interface VoicePipelineButtonProps {
  onResult: (text: string, language: string) => void;
  onLanguageDetected?: (language: string, confidence: number) => void;
  small?: boolean;
  editBeforeExecute?: boolean;
  enableTTS?: boolean; // Enable text-to-speech responses
  autoSpeakResponse?: boolean; // Automatically speak AI responses
}

const LANGUAGE_LABELS: Record<string, string> = {
  hi: 'हिंदी',
  en: 'English',
  auto: 'Auto',
};

export function VoicePipelineButton({
  onResult,
  onLanguageDetected,
  small = false,
  editBeforeExecute = false,
  enableTTS = true,
  autoSpeakResponse = false,
}: VoicePipelineButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [_isSpeaking, setIsSpeaking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('en');
  const [showEditor, setShowEditor] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(enableTTS);
  const animationRef = useRef<number | null>(null);
  const voicePipeline = getVoicePipeline();
  const language = useSettingsStore(state => state.language || 'auto');
  const languageMeta = getLanguageMeta(language);

  // Phase 2, Day 4: Check availability
  useEffect(() => {
    setIsAvailable(voicePipeline.isRecognitionAvailable());
  }, []);

  // Phase 2, Day 4: Monitor speaking state
  useEffect(() => {
    const checkSpeaking = () => {
      setIsSpeaking(voicePipeline.getIsSpeaking());
    };
    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, []);

  // Phase 2, Day 4: Start/stop recognition
  const handleToggle = async () => {
    if (isListening) {
      voicePipeline.stopRecognition();
      setIsListening(false);
      stopWaveformAnimation();
      return;
    }

    if (!isAvailable) {
      toast.error('Voice recognition not available. Please use Chrome or Edge.');
      return;
    }

    try {
      const targetLanguage: VoiceLanguage = language === 'hi' ? 'hi' : language === 'auto' ? 'auto' : 'en';
      
      await voicePipeline.startRecognition({
        language: targetLanguage,
        continuous: false,
        interimResults: false,
        onStart: () => {
          setIsListening(true);
          startWaveformAnimation();
          toast.info(`Listening in ${LANGUAGE_LABELS[targetLanguage] || 'Auto'}...`);
        },
        onResult: async (text, confidence, detectedLang) => {
          setIsListening(false);
          stopWaveformAnimation();
          setDetectedLanguage(detectedLang);
          
          if (onLanguageDetected) {
            onLanguageDetected(detectedLang, confidence);
          }

          // Phase 2, Day 4: Edit before execute
          if (editBeforeExecute) {
            setPendingCommand(text);
            setShowEditor(true);
            toast.info(`Voice command captured in ${LANGUAGE_LABELS[detectedLang] || detectedLang}. Edit if needed.`);
          } else {
            toast.success(`Voice input received in ${LANGUAGE_LABELS[detectedLang] || detectedLang}`);
            onResult(text, detectedLang);
          }
        },
        onError: (error) => {
          setIsListening(false);
          stopWaveformAnimation();
          console.error('[VoicePipelineButton] Recognition error:', error);
        },
        onEnd: () => {
          setIsListening(false);
          stopWaveformAnimation();
        },
      });
    } catch (error: any) {
      console.error('[VoicePipelineButton] Failed to start recognition:', error);
      toast.error('Failed to start voice recognition');
      setIsListening(false);
      stopWaveformAnimation();
    }
  };

  // Phase 2, Day 4: Speak text response
  const speakResponse = async (text: string, lang?: string) => {
    if (!ttsEnabled || !voicePipeline.isSynthesisAvailable()) return;

    try {
      await voicePipeline.speakResponse(text, lang || detectedLanguage, {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: (error) => {
          console.error('[VoicePipelineButton] TTS error:', error);
          setIsSpeaking(false);
        },
      });
    } catch (error) {
      console.error('[VoicePipelineButton] Failed to speak:', error);
    }
  };

  // Phase 2, Day 4: Waveform animation
  const startWaveformAnimation = () => {
    if (animationRef.current) return;
    const animate = () => {
      if (isListening) {
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
    if (!isListening) {
      stopWaveformAnimation();
    }
    return () => stopWaveformAnimation();
  }, [isListening]);

  // Phase 2, Day 4: Expose speakResponse for parent components
  useEffect(() => {
    if (autoSpeakResponse) {
      // This would be called by parent when AI response is ready
      // Parent can use: (window as any).voicePipelineSpeak = speakResponse;
      (window as any).voicePipelineSpeak = speakResponse;
    }
  }, [autoSpeakResponse, detectedLanguage, ttsEnabled]);

  return (
    <div className="flex items-center gap-2">
      {/* Voice Recognition Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!isAvailable}
        className={`${small ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-xs'} rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
          isListening
            ? 'text-white shadow-lg'
            : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
        } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={
          isListening
            ? {
                background: `linear-gradient(120deg, ${languageMeta.gradient[0]}, ${languageMeta.gradient[1]})`,
                boxShadow: `0 12px 24px ${languageMeta.gradient[0]}40`,
              }
            : undefined
        }
        title={`Voice recognition in ${LANGUAGE_LABELS[language] || 'Auto'}`}
      >
        <div className="flex items-center gap-2">
          {isListening ? (
            <>
              <Mic className="h-4 w-4 animate-pulse" />
              {!small && (
                <div className="flex items-center gap-1">
                  {/* Waveform */}
                  <div className="flex h-4 items-end gap-0.5">
                    {[0.6, 0.8, 1.0, 0.7, 0.9].map((height, idx) => (
                      <div
                        key={idx}
                        className="w-0.5 rounded-full"
                        style={{
                          height: `${height * 100}%`,
                          animation: 'waveform 1s ease-in-out infinite',
                          animationDelay: `${idx * 200}ms`,
                          background: `linear-gradient(180deg, ${languageMeta.waveform[0]}, ${languageMeta.waveform[1]})`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="ml-1 text-xs">
                    {LANGUAGE_LABELS[detectedLanguage] || detectedLanguage}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <MicOff className="h-4 w-4" />
              {!small && (
                <span className="text-xs">
                  {LANGUAGE_LABELS[language] || 'Voice'}
                </span>
              )}
            </>
          )}
        </div>
      </button>

      {/* TTS Toggle */}
      {enableTTS && !small && (
        <button
          type="button"
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={`rounded-lg p-2 transition-colors ${
            ttsEnabled
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
          }`}
          title={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
        >
          {ttsEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Language Indicator */}
      {detectedLanguage && detectedLanguage !== 'en' && !small && (
        <div className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1">
          <Languages className="h-3 w-3 text-purple-300" />
          <span className="text-xs text-purple-200">
            {LANGUAGE_LABELS[detectedLanguage] || detectedLanguage}
          </span>
        </div>
      )}

      {/* Voice Command Editor */}
      {showEditor && pendingCommand && (
        <VoiceCommandEditor
          initialCommand={pendingCommand}
          onExecute={(command) => {
            onResult(command, detectedLanguage);
            setShowEditor(false);
            setPendingCommand(null);
          }}
          onCancel={() => {
            setShowEditor(false);
            setPendingCommand(null);
          }}
          language={detectedLanguage}
        />
      )}

      <style>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

