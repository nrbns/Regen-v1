/**
 * Hands-Free Mode Component
 * Continuous voice listening + TTS responses
 */

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';

interface HandsFreeModeProps {
  sessionId: string;
  mode: 'research' | 'trade';
  onCommand?: (command: { type: string; payload: any }) => void;
  onClose?: () => void;
}

export function HandsFreeMode({ sessionId, mode, onCommand, onClose }: HandsFreeModeProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Continuous listening
      recognition.interimResults = false;
      recognition.lang = 'en-US,ta-IN,hi-IN'; // Support multiple languages

      recognition.onresult = async (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0]?.transcript)
          .join(' ')
          .trim();

        if (transcript && !isProcessing) {
          setIsProcessing(true);
          await handleVoiceCommand(transcript);
          setIsProcessing(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Voice recognition error. Please try again.');
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart if hands-free mode is still on
        if (isListening && !isProcessing) {
          try {
            recognition.start();
          } catch {
            // Already started or other error
          }
        }
      };

      recognitionRef.current = recognition;
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isListening, isProcessing]);

  const handleVoiceCommand = async (transcript: string) => {
    // Stop command
    if (transcript.toLowerCase().includes('stop') || transcript.toLowerCase().includes('cancel')) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      speak('Stopped hands-free actions.');
      return;
    }

    try {
      // Send to Regen
      const response = await ipc.regen.query({
        sessionId,
        message: transcript,
        mode,
        source: 'voice',
      });

      // Execute commands
      if (response.commands && response.commands.length > 0) {
        for (const cmd of response.commands) {
          if (onCommand) {
            onCommand(cmd);
          }
        }
      }

      // Speak response
      if (ttsEnabled && response.text) {
        speak(response.text);
      }
    } catch (error) {
      console.error('[HandsFree] Command failed:', error);
      speak('Sorry, I encountered an error. Please try again.');
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current || !ttsEnabled) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Can be made language-aware
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not available in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        speak("Hands-free mode activated. I'm listening...");
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice recognition');
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Controls */}
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg p-2 shadow-lg">
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={`p-2 rounded transition-colors ${
            ttsEnabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          aria-label={ttsEnabled ? 'Disable TTS' : 'Enable TTS'}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleListening}
          className={`p-3 rounded-full transition-colors ${
            isListening
              ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status indicator */}
      {isListening && (
        <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
          {isProcessing ? 'Processing...' : 'Listening...'}
        </div>
      )}
    </div>
  );
}
