/**
 * Optimized Voice Control - On-demand whisper.cpp for battery efficiency
 * Only activates when user explicitly triggers (Ctrl+Space or button click)
 * No always-listening mode to save battery
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from '../../utils/toast';

interface VoiceControlOptimizedProps {
  onTranscript?: (text: string) => void;
  enabled?: boolean;
}

export function VoiceControlOptimized({
  onTranscript,
  enabled = true,
}: VoiceControlOptimizedProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  const startListening = useCallback(async () => {
    if (!enabled) {
      toast.info('Voice control is disabled');
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setIsListening(true);
      setIsProcessing(true);

      // Use whisper.cpp if available, otherwise fallback to Web Speech API
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      const audioChunks: Float32Array[] = [];

      processor.onaudioprocess = event => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioChunks.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Stop after 10 seconds or on manual stop
      const stopTimeout = setTimeout(() => {
        stopListening();
      }, 10000);

      // Store cleanup function
      (processor as any).__cleanup = () => {
        clearTimeout(stopTimeout);
        processor.disconnect();
        source.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error('[VoiceControl] Failed to start listening:', error);
      toast.error('Microphone access denied or unavailable');
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [enabled]);

  const stopListening = useCallback(async () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }

    setIsListening(false);

    // Process audio chunks with whisper.cpp or fallback
    try {
      setIsProcessing(true);

      // TODO: Integrate whisper.cpp binary here
      // For now, use Web Speech API as fallback
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          onTranscript?.(transcript);
          setIsProcessing(false);
        };

        recognition.onerror = () => {
          setIsProcessing(false);
          toast.error('Speech recognition failed');
        };

        recognition.start();
      } else {
        // No speech recognition available
        toast.info('Speech recognition not available. Install whisper.cpp for offline support.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('[VoiceControl] Processing failed:', error);
      setIsProcessing(false);
    }
  }, [mediaStream, onTranscript]);

  // Keyboard shortcut: Ctrl+Space to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space' && enabled) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, enabled, startListening, stopListening]);

  if (!enabled) {
    return null;
  }

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={isProcessing}
      className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-50"
      title={isListening ? 'Stop listening (Ctrl+Space)' : 'Start voice control (Ctrl+Space)'}
    >
      {isProcessing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isListening ? (
        <MicOff className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </button>
  );
}
