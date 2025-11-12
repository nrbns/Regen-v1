/**
 * Regen Whisper - AI voice tips for hands-free navigation
 * Unique feature: Proactive voice guidance > Opera's passive voice
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, X, Sparkles } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';

interface VoiceTip {
  id: string;
  message: string;
  action?: () => void;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

export function VoiceTips() {
  const [isListening, setIsListening] = useState(false);
  const [tips, setTips] = useState<VoiceTip[]>([]);
  const [currentTip, setCurrentTip] = useState<VoiceTip | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Generate contextual tips based on user activity
    const generateTip = (): VoiceTip | null => {
      const tipPool: Omit<VoiceTip, 'id' | 'timestamp'>[] = [
        {
          message: 'Say "new tab" to open a fresh browsing session',
          priority: 'low',
        },
        {
          message: 'Try "search for regenerative design" to start research',
          priority: 'medium',
        },
        {
          message: 'Voice command: "switch to research mode"',
          priority: 'low',
        },
        {
          message: 'Ask "what trackers are blocked?" for privacy status',
          priority: 'medium',
        },
        {
          message: 'Say "show consent timeline" to review privacy decisions',
          priority: 'high',
        },
      ];

      const tip = tipPool[Math.floor(Math.random() * tipPool.length)];
      if (!tip) return null;

      return {
        ...tip,
        id: `tip-${Date.now()}`,
        timestamp: Date.now(),
      };
    };

    // Show a tip every 30-60 seconds when not actively browsing
    const interval = setInterval(() => {
      if (!isMuted && tips.length < 3) {
        const newTip = generateTip();
        if (newTip) {
          setTips((prev) => [...prev, newTip].slice(-3));
        }
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [isMuted, tips.length]);

  useEffect(() => {
    // Show the most recent tip
    if (tips.length > 0) {
      setCurrentTip(tips[tips.length - 1]);
      const timer = setTimeout(() => {
        setCurrentTip(null);
        setTips((prev) => prev.slice(1));
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [tips]);

  const handleVoiceCommand = useCallback(async (command: string) => {
    const lower = command.toLowerCase().trim();

    if (lower.includes('new tab') || lower.includes('open tab')) {
      await ipc.tabs.create('about:blank');
      return { success: true, message: 'Opened new tab' };
    }

    if (lower.includes('research mode') || lower.includes('switch to research')) {
      // Navigate to research mode
      window.location.hash = '#/';
      return { success: true, message: 'Switched to research mode' };
    }

    if (lower.includes('trackers') || lower.includes('privacy')) {
      // Open trust dashboard
      const { useTrustDashboardStore } = await import('../../state/trustDashboardStore');
      useTrustDashboardStore.getState().open();
      return { success: true, message: 'Opened privacy dashboard' };
    }

    if (lower.includes('consent timeline')) {
      const { useConsentOverlayStore } = await import('../../state/consentOverlayStore');
      useConsentOverlayStore.getState().open();
      return { success: true, message: 'Opened consent timeline' };
    }

    return { success: false, message: 'Command not recognized' };
  }, []);

  const startListening = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[VoiceTips] Speech recognition not available');
      return;
    }

    setIsListening(true);
    const Recognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      void handleVoiceCommand(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [handleVoiceCommand]);

  if (isMuted) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {currentTip && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-blue-500/40 bg-blue-500/15 px-4 py-3 text-sm text-blue-100 shadow-lg backdrop-blur-sm">
              <Sparkles size={16} className="text-blue-300" />
              <span>{currentTip.message}</span>
              <button
                type="button"
                onClick={() => {
                  setCurrentTip(null);
                  setTips((prev) => prev.filter((t) => t.id !== currentTip.id));
                }}
                className="ml-2 rounded-lg p-1 hover:bg-blue-500/20"
                aria-label="Dismiss tip"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex flex-col items-end gap-2">
          <motion.button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/90 p-2.5 text-slate-200 shadow-lg backdrop-blur-sm hover:bg-slate-800/90"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isMuted ? 'Unmute voice tips' : 'Mute voice tips'}
          >
            {isMuted ? <Volume2 size={18} /> : <MicOff size={18} />}
          </motion.button>

          {!isMuted && (
            <motion.button
              type="button"
              onClick={startListening}
              disabled={isListening}
              className={`flex items-center justify-center rounded-full border p-3 shadow-lg backdrop-blur-sm transition-all ${
                isListening
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200'
                  : 'border-blue-500/60 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={isListening ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: isListening ? Infinity : 0 }}
              aria-label="Start voice command"
            >
              <Mic size={20} />
            </motion.button>
          )}
        </div>
      </div>
    </>
  );
}

