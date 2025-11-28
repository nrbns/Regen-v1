import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Sparkles, X } from 'lucide-react';
import { useSettingsStore } from '../state/settingsStore';
import { parseWisprCommand, executeWisprCommand } from '../core/wispr/commandHandler';
import { toast } from '../utils/toast';

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
  if (!lang || lang === 'auto') return 'hi-IN,en-US'; // Support both Hindi and English
  return LANGUAGE_LOCALE_MAP[lang] || lang.includes('-') ? lang : `${lang}-${lang.toUpperCase()}`;
}

export function WisprOrb() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recogRef = useRef<any>(null);
  const language = useSettingsStore(state => state.language || 'auto');

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
      // Parse and execute command
      const command = parseWisprCommand(text);

      // Show command type in UI
      const commandType =
        command.type.charAt(0).toUpperCase() + command.type.slice(1).replace('_', ' ');
      setTranscript(`Executing ${commandType}...`);

      await executeWisprCommand(command);

      // Show success feedback
      setTranscript(`✓ ${commandType} completed`);
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
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        if (listening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
            className={`w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-2xl flex items-center justify-center transition-all ${
              listening ? 'animate-pulse scale-110 ring-4 ring-purple-500/50' : 'hover:scale-105'
            }`}
          >
            {listening ? (
              <Mic className="w-10 h-10 text-white animate-bounce" />
            ) : (
              <Sparkles className="w-10 h-10 text-white" />
            )}
          </div>
        </button>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-4 py-2 rounded-full text-sm whitespace-nowrap pointer-events-none">
          Ctrl + Space to talk
        </div>
      </motion.div>

      {/* Voice Panel (when active) */}
      {listening && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-48 right-8 bg-black/90 backdrop-blur-xl border border-purple-600 rounded-3xl p-8 shadow-2xl max-w-md z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <p className="text-2xl font-bold text-purple-300">
                {isProcessing ? 'Processing...' : 'WISPR Listening...'}
              </p>
            </div>
            <button
              onClick={stopListening}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Stop listening"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {transcript && (
            <div className="mt-4 p-4 bg-purple-900/20 rounded-xl border border-purple-500/30">
              <p className="text-sm text-gray-300 mb-2">You said:</p>
              <p className="text-white font-medium">{transcript}</p>
            </div>
          )}

          <p className="mt-4 text-gray-400 text-sm">
            {isProcessing
              ? 'Executing your command...'
              : 'Say anything in Hindi or English. Try: "Nifty kharido 50" or "Research Tesla earnings"'}
          </p>
        </motion.div>
      )}
    </>
  );
}

export default WisprOrb;
