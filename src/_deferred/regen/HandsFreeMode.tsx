/**
 * Hands-Free Mode Component (deferred)
 * Original implementation moved to _deferred to reduce active bundle surface for v1.
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

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US,ta-IN,hi-IN';

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
        if (isListening && !isProcessing) {
          try {
            recognition.start();
          } catch {
            // noop
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
    if (transcript.toLowerCase().includes('stop') || transcript.toLowerCase().includes('cancel')) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      speak('Stopped hands-free actions.');
      return;
    }

    try {
      const response = await ipc.regen.query({
        sessionId,
        message: transcript,
        mode,
        source: 'voice',
      });

      if (response.commands && response.commands.length > 0) {
        for (const cmd of response.commands) {
          if (onCommand) {
            onCommand(cmd);
          }
        }
      }

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
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
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
      <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-lg">
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={`rounded p-2 transition-colors ${
            ttsEnabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          aria-label={ttsEnabled ? 'Disable TTS' : 'Enable TTS'}
        >
          {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          onClick={toggleListening}
          className={`rounded-full p-3 transition-colors ${
            isListening
              ? 'animate-pulse bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 transition-colors hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isListening && (
        <div className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white">
          {isProcessing ? 'Processing...' : 'Listening...'}
        </div>
      )}
    </div>
  );
}
