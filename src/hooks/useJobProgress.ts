import { useEffect, useMemo, useRef, useState } from 'react';
import { initSocketClient, getSocketClient } from '../services/realtime/socketClient';
import { EVENTS } from '../../packages/shared/events';
import { saveJobSession } from './useSessionRestore';

export interface JobProgressConnection {
  isOnline: boolean;
  socketStatus: 'connected' | 'connecting' | 'disconnected';
  retryCount: number;
}

type ProgressState = {
  jobId: string | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
};

export function useJobProgress(jobId: string | null) {
  const [connection, setConnection] = useState<JobProgressConnection>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    socketStatus: 'disconnected',
    retryCount: 0,
  });
  const [state, setState] = useState<ProgressState>({ jobId, status: 'idle' });
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const lastSequenceRef = useRef(0);

  const token = useMemo(() => {
    try {
      return localStorage.getItem('auth:token');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let offConnected: (() => void) | null = null;
    let offReconnecting: (() => void) | null = null;
    let offDisconnected: (() => void) | null = null;
    let offChunk: (() => void) | null = null;

    const setup = async () => {
      try {
        await initSocketClient({
          url: (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:3000',
          token,
          deviceId: `web-${Date.now()}`,
        });
        const client = getSocketClient();

        // Connection status handlers
        offConnected = client.on('socket:connected', () => {
          setConnection(prev => ({ ...prev, socketStatus: 'connected', retryCount: 0 }));
        });
        offReconnecting = client.on('socket:reconnecting', (data: any) => {
          setConnection(prev => ({
            ...prev,
            socketStatus: 'connecting',
            retryCount: data?.attempt ?? prev.retryCount + 1,
          }));
        });
        offDisconnected = client.on('socket:disconnected', () => {
          setConnection(prev => ({ ...prev, socketStatus: 'disconnected' }));
        });

        // Streaming chunks
        offChunk = client.on(EVENTS.MODEL_CHUNK, (data: any) => {
          const text = typeof data?.chunk === 'string' ? data.chunk : (data?.text ?? '');
          if (text) {
            setIsStreaming(true);
            setStreamingText(prev => (prev ? prev + text : text));
          }
          const seq =
            typeof data?.sequence === 'number' ? data.sequence : lastSequenceRef.current + 1;
          lastSequenceRef.current = seq;
        });

        if (jobId) {
          setState({ jobId, status: 'running' });
          unsub = client.subscribeToJob(
            jobId,
            (data: any) => {
              const seq =
                typeof data?.sequence === 'number' ? data.sequence : lastSequenceRef.current + 1;
              lastSequenceRef.current = seq;
            },
            (data: any) => {
              setState({ jobId, status: 'completed' });
              setIsStreaming(false);
            },
            (err: string) => {
              setState({ jobId, status: 'failed', error: err });
              setIsStreaming(false);
            }
          );
        }
      } catch (error) {
        // Optional realtime
      }
    };

    setup();

    return () => {
      try {
        unsub?.();
        offConnected?.();
        offReconnecting?.();
        offDisconnected?.();
        offChunk?.();
      } catch {}
    };
  }, [jobId, token]);

  // Auto-save job session progress
  useEffect(() => {
    if (!jobId || state.status !== 'running') return;

    // Save every 2 seconds while job is running
    const interval = setInterval(() => {
      const progress = Math.floor(Math.random() * 100); // In real app, track actual progress
      saveJobSession(jobId, lastSequenceRef.current, progress, Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, state.status]);

  const cancel = () => {
    try {
      if (jobId) getSocketClient().cancelJob(jobId);
    } catch {}
  };

  return {
    state,
    cancel,
    isStreaming,
    streamingText,
    connection,
    lastSequence: lastSequenceRef.current,
  };
}
