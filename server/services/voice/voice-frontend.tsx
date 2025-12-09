/**
 * Voice Mode Frontend Component
 * React component for voice input with WebSocket streaming
 */

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceState {
  isListening: boolean;
  transcript: string;
  response: string;
  error: string | null;
}

export function VoiceInput() {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    response: '',
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
  const voiceWsUrl = `${wsUrl}/ws/voice`;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startListening = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect WebSocket
      const ws = new WebSocket(voiceWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[VoiceInput] WebSocket connected');
        setState(prev => ({ ...prev, isListening: true, error: null }));
      };

      ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'transcription':
              setState(prev => ({ ...prev, transcript: msg.text }));
              break;

            case 'token':
              setState(prev => ({ ...prev, response: prev.response + msg.text }));
              break;

            case 'done':
              setState(prev => ({
                ...prev,
                response: msg.final,
                isListening: false,
              }));
              stopListening();
              break;

            case 'error':
              setState(prev => ({
                ...prev,
                error: msg.message,
                isListening: false,
              }));
              stopListening();
              break;
          }
        } catch (error) {
          console.error('[VoiceInput] Message parse error:', error);
        }
      };

      ws.onerror = error => {
        console.error('[VoiceInput] WebSocket error:', error);
        setState(prev => ({
          ...prev,
          error: 'Connection error',
          isListening: false,
        }));
      };

      ws.onclose = () => {
        console.log('[VoiceInput] WebSocket closed');
        setState(prev => ({ ...prev, isListening: false }));
      };

      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      // Record in 250ms chunks
      mediaRecorder.start(250);
    } catch (error: any) {
      console.error('[VoiceInput] Failed to start listening:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to access microphone',
        isListening: false,
      }));
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({ ...prev, isListening: false }));
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={state.isListening ? stopListening : startListening}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition ${
            state.isListening
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          {state.isListening ? (
            <>
              <MicOff size={20} />
              Stop Listening
            </>
          ) : (
            <>
              <Mic size={20} />
              Press & Speak
            </>
          )}
        </button>

        {state.isListening && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
            Listening...
          </div>
        )}
      </div>

      {state.transcript && (
        <div className="rounded-lg bg-gray-100 p-3">
          <div className="text-sm font-medium text-gray-700">You said:</div>
          <div className="mt-1 text-gray-900">{state.transcript}</div>
        </div>
      )}

      {state.response && (
        <div className="rounded-lg bg-indigo-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
            <Volume2 size={16} />
            Response:
          </div>
          <div className="mt-1 text-indigo-900">{state.response}</div>
        </div>
      )}

      {state.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Error: {state.error}</div>
      )}
    </div>
  );
}
