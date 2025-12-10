import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Sparkles, X, Eye, Brain } from 'lucide-react';
import { useSettingsStore } from '../state/settingsStore';
import { parseWisprCommand, executeWisprCommand } from '../core/wispr/commandHandler';
import { toast } from '../utils/toast';
import { isElectronRuntime } from '../lib/env';

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  hi: 'hi-IN',
  en: 'en-US',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
};

function getSpeechRecognitionLocale(lang?: string): string {
  // Phase 2, Day 4: Support both Hindi and English simultaneously for best accuracy
  // DESI POLISH: Enhanced language detection for all Indian languages
  if (!lang || lang === 'auto') return 'hi-IN,en-US'; // Default to Hindi + English
  if (lang === 'hi') return 'hi-IN,en-US'; // Support both
  if (lang === 'en') return 'en-US,hi-IN'; // Support both

  // For other Indian languages, support with English fallback
  const indianLanguages = [
    'ta',
    'te',
    'bn',
    'mr',
    'kn',
    'ml',
    'gu',
    'pa',
    'ur',
    'or',
    'as',
    'mai',
    'sat',
    'ne',
    'kok',
    'mni',
    'brx',
    'doi',
    'ks',
    'sa',
  ];
  if (indianLanguages.includes(lang)) {
    const locale = LANGUAGE_LOCALE_MAP[lang] || `${lang}-IN`;
    return `${locale},en-US`; // Support Indian language + English
  }
  return LANGUAGE_LOCALE_MAP[lang] || lang.includes('-') ? lang : `${lang}-${lang.toUpperCase()}`;
}

export function WisprOrb() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isJarvisMode, setIsJarvisMode] = useState(false);
  const [visionEnabled, setVisionEnabled] = useState(false);
  const recogRef = useRef<any>(null);
  const language = useSettingsStore(state => state.language || 'auto');

  const wakeWords = ['hey wispr', 'jarvis', 'regen', 'wake up'];

  // Initialize Speech Recognition
  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('[WISPR] Speech Recognition not available');
      return;
    }

    try {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getSpeechRecognitionLocale(language);
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const results = Array.isArray(event.results) ? Array.from(event.results) : [];
        const latestResult = results[results.length - 1] as any;
        const transcript = latestResult?.[0]?.transcript || '';

        if (latestResult?.isFinal) {
          // Final result - execute command
          setTranscript(transcript.trim());
          setIsProcessing(true);
          handleCommand(transcript.trim());
        } else {
          // Interim result - show live transcript
          setTranscript(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[WISPR] Speech recognition error:', event.error);
        setListening(false);
        setIsProcessing(false);
        setTranscript('');

        if (event.error === 'not-allowed') {
          toast.error('Microphone permission denied. Please enable it in browser settings.');
        } else if (event.error === 'no-speech') {
          // Silent timeout - just stop listening
          setListening(false);
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setListening(false);
        setIsProcessing(false);
        setTranscript('');
      };

      recogRef.current = recognition;
    } catch (error) {
      console.error('[WISPR] Failed to initialize speech recognition:', error);
    }
  }, [language]);

  const handleCommand = async (text: string) => {
    if (!text.trim()) {
      setListening(false);
      return;
    }

    try {
      setIsProcessing(true);

      // Check for wake words (Jarvis mode)
      const lowerText = text.toLowerCase();
      const hasWakeWord = wakeWords.some(word => lowerText.includes(word));

      if (hasWakeWord || isJarvisMode) {
        setIsJarvisMode(true);
        setVisionEnabled(true);

        // Extract command after wake word
        let commandText = text;
        for (const wakeWord of wakeWords) {
          if (lowerText.includes(wakeWord)) {
            commandText = text
              .substring(text.toLowerCase().indexOf(wakeWord) + wakeWord.length)
              .trim();
            break;
          }
        }

        // Vision: Auto-screenshot + send to llava
        if (isElectronRuntime()) {
          try {
            const { ipc } = await import('../lib/ipc-typed');

            // Capture screen
            const screenshot = await ipc.vision.captureScreen();

            // Analyze with vision
            const visionPrompt = `User said: "${commandText || text}"\nDescribe what you see on screen and suggest the best action.`;
            const visionResponse = await ipc.vision.analyze(visionPrompt, screenshot);

            // Phase 2, Day 4: Enhanced TTS with language detection
            if ('speechSynthesis' in window) {
              const { getVoicePipeline } = await import('../services/voice/voicePipeline');
              const voicePipeline = getVoicePipeline();
              const detectedLang = language === 'hi' ? 'hi' : 'en';
              await voicePipeline.speakResponse(
                visionResponse || 'Command processed',
                detectedLang,
                { rate: 1.0, pitch: 1.0, volume: 1.0 }
              );

              // Show vision response in transcript
              setTranscript(
                `Jarvis: ${visionResponse.substring(0, 100)}${visionResponse.length > 100 ? '...' : ''}`
              );
            }
          } catch (error) {
            console.warn('[WISPR] Vision processing failed:', error);
            toast.warning('Vision analysis unavailable. Using text-only mode.');
          }
        }

        // Action: Execute command
        const command = parseWisprCommand(commandText || text);
        const commandType =
          command.type.charAt(0).toUpperCase() + command.type.slice(1).replace('_', ' ');
        setTranscript(`Jarvis: Executing ${commandType}...`);

        await executeWisprCommand(command);

        setTranscript(`✓ Jarvis: ${commandType} completed`);
      } else {
        // Normal command execution
        const command = parseWisprCommand(text);
        const commandType =
          command.type.charAt(0).toUpperCase() + command.type.slice(1).replace('_', ' ');
        setTranscript(`Executing ${commandType}...`);

        await executeWisprCommand(command);

        setTranscript(`✓ ${commandType} completed`);
      }

      setTimeout(() => {
        setTranscript('');
      }, 2000);
    } catch (error) {
      console.error('[WISPR] Command execution error:', error);
      setTranscript('✗ Command failed');
      toast.error('Failed to execute command');
      setTimeout(() => {
        setTranscript('');
      }, 2000);
    } finally {
      setIsProcessing(false);
      setListening(false);
      setTimeout(() => {
        setTranscript('');
      }, 3000);
    }
  };

  const startListening = () => {
    const SR: any = recogRef.current;
    if (!SR) {
      toast.error('Speech recognition not available. Please use Chrome or Edge.');
      return;
    }

    try {
      setListening(true);
      setTranscript('');
      setIsProcessing(false);
      SR.start();
      toast.info('WISPR listening... Speak now');
    } catch (error: any) {
      console.error('[WISPR] Failed to start recognition:', error);
      setListening(false);
      if (error.message?.includes('already started')) {
        // Recognition already running, stop and restart
        SR.stop();
        setTimeout(() => {
          SR.start();
          setListening(true);
        }, 100);
      } else {
        toast.error('Failed to start voice recognition');
      }
    }
  };

  const stopListening = () => {
    const SR: any = recogRef.current;
    if (SR) {
      try {
        SR.stop();
      } catch (error) {
        console.error('[WISPR] Error stopping recognition:', error);
      }
    }
    setListening(false);
    setIsProcessing(false);
    setTranscript('');
  };

  // Global hotkey: Ctrl + Space
  // Listen for global hotkey events from Tauri
  useEffect(() => {
    if (isElectronRuntime()) {
      const setupGlobalHotkeys = async () => {
        try {
          const { ipcEvents } = await import('../lib/ipc-events');

          // Listen for wake-wispr event (Ctrl+Shift+Space)
          ipcEvents.on('wake-wispr', () => {
            if (!listening) {
              startListening();
              setIsJarvisMode(true);
              toast.info('Jarvis mode activated!');
            }
          });

          // Listen for open-trade-mode event (Ctrl+Shift+T)
          ipcEvents.on('open-trade-mode', async () => {
            const { useAppStore } = await import('../state/appStore');
            useAppStore.getState().setMode('Trade');
            toast.info('Trade mode opened');
          });
        } catch (error) {
          console.warn('[WISPR] Global hotkey setup failed:', error);
        }
      };

      setupGlobalHotkeys();
    }
  }, [listening]);

  // Global hotkey: Ctrl + Space (works everywhere)
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Space' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        if (listening) {
          stopListening();
        } else {
          startListening();
          setIsJarvisMode(true);
        }
      }

      // Cancel with "Band kar" / "Stop" - also listen for these keys
      if (listening && (event.key === 'Escape' || (event.ctrlKey && event.key === 'c'))) {
        event.preventDefault();
        stopListening();
        toast.info('WISPR stopped');
      }
    };

    window.addEventListener('keydown', handleKey, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [listening]);

  return (
    <>
      {/* Floating Orb */}
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-24 right-8 z-50 cursor-move"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={() => (listening ? stopListening() : startListening())}
          className="relative"
          aria-label="WISPR Voice Assistant"
        >
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-2xl transition-all ${
              listening ? 'scale-110 animate-pulse ring-4 ring-purple-500/50' : 'hover:scale-105'
            } ${isJarvisMode ? 'ring-4 ring-blue-500' : ''}`}
          >
            {listening ? (
              <Mic className="h-10 w-10 animate-bounce text-white" />
            ) : isJarvisMode ? (
              <Brain className="h-10 w-10 text-white" />
            ) : (
              <Sparkles className="h-10 w-10 text-white" />
            )}
          </div>
          {visionEnabled && (
            <div className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
              <Eye className="h-3 w-3 text-white" />
            </div>
          )}
        </button>
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-4 py-2 text-sm backdrop-blur">
          {isJarvisMode ? 'Jarvis Mode' : 'Ctrl + Space to talk'}
        </div>
      </motion.div>

      {/* Voice Panel (when active) */}
      {listening && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-48 right-8 z-50 max-w-md rounded-3xl border border-purple-600 bg-black/90 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 w-4 animate-pulse rounded-full bg-red-500" />
              <p className="text-2xl font-bold text-purple-300">
                {isProcessing ? 'Processing...' : 'WISPR Listening...'}
              </p>
            </div>
            <button
              onClick={stopListening}
              className="text-gray-400 transition-colors hover:text-white"
              aria-label="Stop listening"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {transcript && (
            <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-900/20 p-4">
              <p className="mb-2 text-sm text-gray-300">You said:</p>
              <p className="text-lg font-medium text-white">{transcript}</p>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-400">
            {isProcessing
              ? 'Executing your command...'
              : 'Say in Hindi or English:\n"निफ्टी खरीदो 50" or "Buy 50 Nifty"\n"Research Tesla" or "Screenshot le"'}
          </p>

          <button
            onClick={stopListening}
            className="mt-4 w-full rounded-lg border border-red-500/50 bg-red-600/20 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-600/30"
          >
            Band kar / Stop (Esc)
          </button>
        </motion.div>
      )}
    </>
  );
}

export default WisprOrb;
