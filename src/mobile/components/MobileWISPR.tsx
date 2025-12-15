/**
 * Mobile WISPR Voice Assistant UI
 * Compact, touch-optimized voice interface for mobile
 */

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Volume2 } from 'lucide-react';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { VoiceButton } from '../../components/voice';

interface MobileWISPRProps {
  onClose?: () => void;
  onResult?: (text: string) => void;
}

export function MobileWISPR({ onClose, onResult }: MobileWISPRProps) {
  const { isMobile } = useMobileDetection();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Don't render on desktop
  if (!isMobile) return null;

  const handleResult = (text: string) => {
    setTranscript(text);
    setIsListening(false);
    setIsProcessing(true);
    onResult?.(text);
    // Reset after a delay
    setTimeout(() => {
      setTranscript('');
      setIsProcessing(false);
    }, 3000);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="safe-bottom w-full max-w-md rounded-t-2xl border-l border-r border-t border-gray-800 bg-gray-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">WISPR Voice Assistant</h3>
              <p className="text-xs text-gray-400">Tap mic to speak</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center p-2 text-gray-400 transition-colors hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-6 p-6">
          {/* Voice Button */}
          <VoiceButton onResult={handleResult} small={false} editBeforeExecute={true} />

          {/* Status */}
          {isListening && (
            <div className="flex items-center gap-2 text-indigo-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Listening...</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-purple-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="w-full rounded-lg bg-gray-800 p-4">
              <p className="text-sm text-white">{transcript}</p>
            </div>
          )}

          {/* Hint */}
          <p className="text-center text-xs text-gray-500">
            Say "Research", "Trade", or ask a question
          </p>
        </div>
      </div>
    </div>
  );
}
