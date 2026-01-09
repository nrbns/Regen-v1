import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, RotateCcw } from 'lucide-react';
import { getRealtimeVoice, VOICE_LANGUAGES, SupportedLanguage, disposeRealtimeVoice } from '../../services/voice/realtimeVoice';

interface VoiceInputProps {
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  language?: SupportedLanguage;
  autoStart?: boolean;
}

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  interimTranscript: string;
  confidence: number;
  error?: string;
  waveformData: number[];
}

/**
 * Production-ready Voice Input Component
 * Features:
 * - Live transcription preview
 * - Visual waveform feedback
 * - Error handling and recovery
 * - Language selection
 * - Seamless integration with AI tasks
 */
export function VoiceInput({
  onTranscript,
  onError,
  placeholder = "Click mic to start voice input...",
  className = "",
  language = 'en-US',
  autoStart = false,
}: VoiceInputProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    currentTranscript: '',
    interimTranscript: '',
    confidence: 0,
    waveformData: [],
  });

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const voiceService = useRef(getRealtimeVoice({ language: selectedLanguage }));
  const waveformRef = useRef<HTMLDivElement>(null);

  // Initialize voice service
  useEffect(() => {
    const voice = voiceService.current;

    // Set up callbacks
    voice.setCallbacks({
      onTranscript: (transcript, isFinal) => {
        if (isFinal) {
          onTranscript?.(transcript);
        }
      },
      onError: (error) => {
        setVoiceState(prev => ({ ...prev, error }));
        onError?.(error);
      },
      onStateChange: (state) => {
        setVoiceState(prev => ({ ...prev, ...state }));
      },
      onWaveform: (waveformData) => {
        setVoiceState(prev => ({ ...prev, waveformData }));
      },
    });

    // Check microphone permission
    checkMicrophonePermission();

    // Cleanup on unmount
    return () => {
      voice.stop();
    };
  }, [onTranscript, onError]);

  // Update language when changed
  useEffect(() => {
    voiceService.current.setLanguage(selectedLanguage);
  }, [selectedLanguage]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && permissionGranted === true && !voiceState.isListening) {
      handleStartListening();
    }
  }, [autoStart, permissionGranted]);

  // Update waveform visualization
  useEffect(() => {
    if (waveformRef.current && voiceState.waveformData.length > 0) {
      const bars = waveformRef.current.children;
      voiceState.waveformData.forEach((value, index) => {
        if (bars[index]) {
          const height = Math.max(2, value * 40); // Min 2px, max 40px
          (bars[index] as HTMLElement).style.height = `${height}px`;
        }
      });
    }
  }, [voiceState.waveformData]);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionGranted(result.state === 'granted');
    } catch (error) {
      // Fallback: try to get user media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionGranted(true);
      } catch {
        setPermissionGranted(false);
      }
    }
  };

  const handleStartListening = async () => {
    try {
      setVoiceState(prev => ({ ...prev, error: undefined }));
      await voiceService.current.start();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice recognition';
      setVoiceState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  };

  const handleStopListening = () => {
    voiceService.current.stop();
  };

  const handleClearTranscript = () => {
    voiceService.current.clearTranscript();
  };

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    setSelectedLanguage(newLanguage);
    setShowLanguageSelector(false);
    if (voiceState.isListening) {
      voiceService.current.stop();
      setTimeout(() => handleStartListening(), 100);
    }
  };

  const getDisplayTranscript = () => {
    if (voiceState.currentTranscript && voiceState.interimTranscript) {
      return voiceState.currentTranscript + voiceState.interimTranscript;
    }
    return voiceState.currentTranscript || voiceState.interimTranscript || '';
  };

  const getConfidenceColor = () => {
    if (voiceState.confidence > 0.8) return 'text-green-400';
    if (voiceState.confidence > 0.6) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (!voiceService.current.isAvailable()) {
    return (
      <div className={`p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400 ${className}`}>
        <div className="flex items-center gap-2">
          <MicOff size={20} />
          <span>Voice input not supported in this browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-input ${className}`}>
      {/* Main Input Area */}
      <div className="relative bg-slate-800 border-2 rounded-lg transition-all duration-200 focus-within:border-blue-500 overflow-hidden">
        {/* Transcript Display */}
        <div className="min-h-12 p-3 pr-24 flex items-center">
          {getDisplayTranscript() ? (
            <div className="flex-1">
              <div className="text-white text-sm leading-relaxed">
                {voiceState.currentTranscript && (
                  <span className="text-green-400">{voiceState.currentTranscript}</span>
                )}
                {voiceState.interimTranscript && (
                  <span className="text-gray-400 italic">{voiceState.interimTranscript}</span>
                )}
              </div>
              {voiceState.confidence > 0 && (
                <div className={`text-xs mt-1 ${getConfidenceColor()}`}>
                  Confidence: {Math.round(voiceState.confidence * 100)}%
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic">
              {voiceState.isListening ? 'Listening...' : placeholder}
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        {voiceState.isListening && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
            <div
              ref={waveformRef}
              className="flex items-end justify-center h-full gap-px"
            >
              {Array.from({ length: 32 }, (_, i) => (
                <div
                  key={i}
                  className="bg-blue-400 rounded-sm transition-all duration-100 flex-1"
                  style={{ height: '2px' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {/* Language Selector */}
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Change language"
          >
            <span className="text-xs font-mono">{selectedLanguage.split('-')[0].toUpperCase()}</span>
          </button>

          {/* Clear Button */}
          {getDisplayTranscript() && (
            <button
              onClick={handleClearTranscript}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Clear transcript"
            >
              <RotateCcw size={16} />
            </button>
          )}

          {/* Mic Button */}
          <button
            onClick={voiceState.isListening ? handleStopListening : handleStartListening}
            className={`p-2 rounded-full transition-all duration-200 ${
              voiceState.isListening
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } ${voiceState.error ? 'bg-gray-600 cursor-not-allowed' : ''}`}
            title={voiceState.isListening ? 'Stop listening' : 'Start voice input'}
            disabled={!!voiceState.error}
          >
            {voiceState.isListening ? <Square size={16} /> : <Mic size={16} />}
          </button>
        </div>
      </div>

      {/* Language Selector Dropdown */}
      {showLanguageSelector && (
        <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {Object.entries(VOICE_LANGUAGES).map(([code, name]) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code as SupportedLanguage)}
              className={`w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors ${
                selectedLanguage === code ? 'bg-slate-700 text-blue-400' : 'text-white'
              }`}
            >
              <div className="text-sm">{name}</div>
              <div className="text-xs text-gray-400">{code}</div>
            </button>
          ))}
        </div>
      )}

      {/* Error Display */}
      {voiceState.error && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start gap-2">
            <MicOff size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-red-400 text-sm">
              <div className="font-medium">Voice Error</div>
              <div className="mt-1">{voiceState.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Warning */}
      {permissionGranted === false && (
        <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
          <div className="flex items-start gap-2">
            <MicOff size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-yellow-400 text-sm">
              <div className="font-medium">Microphone Permission Required</div>
              <div className="mt-1">
                Please allow microphone access to use voice input. Check your browser settings.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
