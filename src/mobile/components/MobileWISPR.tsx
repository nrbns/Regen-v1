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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="w-full max-w-md bg-gray-900 rounded-t-2xl border-t border-l border-r border-gray-800 shadow-2xl safe-bottom"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">WISPR Voice Assistant</h3>
              <p className="text-gray-400 text-xs">Tap mic to speak</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-6">
          {/* Voice Button */}
          <VoiceButton
            onResult={handleResult}
            small={false}
            editBeforeExecute={true}
          />

          {/* Status */}
          {isListening && (
            <div className="flex items-center gap-2 text-indigo-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Listening...</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-purple-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="w-full p-4 bg-gray-800 rounded-lg">
              <p className="text-white text-sm">{transcript}</p>
            </div>
          )}

          {/* Hint */}
          <p className="text-gray-500 text-xs text-center">
            Say "Research", "Trade", or ask a question
          </p>
        </div>
      </div>
    </div>
  );
}

