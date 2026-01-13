/**
 * Voice Status Indicator
 * 
 * Shows when voice recognition is active
 */

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { isVoiceRecognitionActive, stopVoiceRecognition, isVoiceRecognitionAvailable } from '../../core/regen-v1/voiceTriggers';
import { regenEventBus } from '../../core/events/eventBus';

export function VoiceStatusIndicator() {
  const [isActive, setIsActive] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check availability
    setIsAvailable(isVoiceRecognitionAvailable());

    // Subscribe to voice state changes
    const unsubscribe = regenEventBus.subscribe((event) => {
      if (event.type === 'AVATAR_INVOKE') {
        // Check if voice is active when avatar is invoked
        setIsActive(isVoiceRecognitionActive());
      }
    });

    // Check periodically
    const interval = setInterval(() => {
      setIsActive(isVoiceRecognitionActive());
      setIsAvailable(isVoiceRecognitionAvailable());
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!isAvailable) {
    return null; // Don't show if voice not available
  }

  if (!isActive) {
    return null; // Don't show when not active
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 flex items-center gap-3">
        <div className="relative">
          <Mic className="w-5 h-5 text-red-400 animate-pulse" />
          <div className="absolute inset-0 bg-red-400/20 rounded-full animate-ping" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Voice Active</div>
          <div className="text-xs text-slate-400">Listening for commands...</div>
        </div>
        <button
          onClick={() => stopVoiceRecognition()}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
          title="Stop voice recognition"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
