/**
 * useJobProgress Hook
 * React hook for subscribing to and managing job progress
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocketClient } from '../services/socket';
import type { JobState } from '../../../packages/shared/events';

export interface JobProgressState {
  jobId: string;
  state: JobState;
  progress: number; // 0-100
  step: string;
  partial?: string; // Streaming text
  error?: string;
  isComplete: boolean;
  isFailed: boolean;
}

export interface UseJobProgressOptions {
  onProgress?: (state: JobProgressState) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useJobProgress(
  jobId: string | null,
  options: UseJobProgressOptions = {}
): {
  state: JobProgressState | null;
  cancel: () => void;
  isStreaming: boolean;
  streamingText: string;
  connection: {
    isOnline: boolean;
    socketStatus: 'connected' | 'connecting' | 'disconnected';
    retryCount: number;
  };
} {
  const [state, setState] = useState<JobProgressState | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connection, setConnection] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    socketStatus: 'disconnected' as 'connected' | 'connecting' | 'disconnected',
    retryCount: 0,
  });
  const unsubscribeRef = useRef<() => void | null>(null);
  const connectionUnsubs = useRef<Array<() => void>>([]);

  // Connection state listeners (socket + browser online/offline)
  useEffect(() => {
    const handleOnline = () => setConnection(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setConnection(prev => ({ ...prev, isOnline: false }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    try {
      const socket = getSocketClient();
      const unsubConnected = socket.on('socket:connected', () =>
        setConnection(prev => ({ ...prev, socketStatus: 'connected', retryCount: 0 }))
      );
      const unsubDisconnected = socket.on('socket:disconnected', () =>
        setConnection(prev => ({ ...prev, socketStatus: 'disconnected' }))
      );
      const unsubReconnecting = socket.on('socket:reconnecting', (data: any) =>
        setConnection(prev => ({
          ...prev,
          socketStatus: 'connecting',
          retryCount: data?.attempt || 0,
        }))
      );

      if (socket.isReady()) {
        setConnection(prev => ({ ...prev, socketStatus: 'connected' }));
      }

      connectionUnsubs.current = [unsubConnected, unsubDisconnected, unsubReconnecting];
    } catch {
      // Socket not initialized yet
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connectionUnsubs.current.forEach(fn => fn?.());
      connectionUnsubs.current = [];
    };
  }, []);

  // Subscribe to job when jobId changes
  useEffect(() => {
    if (!jobId) {
      setState(null);
      setStreamingText('');
      setIsStreaming(false);
      return;
    }

    // Reset streaming buffer on job change
    setStreamingText('');
    setIsStreaming(false);

    try {
      const socket = getSocketClient();

      // Subscribe to job
      unsubscribeRef.current = socket.subscribeToJob(
        jobId,
        (progressData: any) => {
          // Update progress
          const newState: JobProgressState = {
            jobId,
            state: progressData.state || 'running',
            progress: progressData.progress || 0,
            step: progressData.step || 'Processing...',
            partial: progressData.partial,
            isComplete: progressData.state === 'completed',
            isFailed: progressData.state === 'failed',
          };

          setState(newState);

          // Handle streaming text
          if (progressData.partial) {
            setStreamingText(prev => prev + progressData.partial);
            setIsStreaming(true);
          }

          // Call user callback
          options.onProgress?.(newState);
        },
        (completeData: any) => {
          // Job completed
          setState(prev =>
            prev ? { ...prev, state: 'completed', progress: 100, isComplete: true } : null
          );
          options.onComplete?.(completeData);
          setIsStreaming(false);
        },
        (error: string) => {
          // Job error
          setState(prev => (prev ? { ...prev, state: 'failed', error, isFailed: true } : null));
          options.onError?.(error);
          setIsStreaming(false);
        }
      );
    } catch (error) {
      console.error('[useJobProgress] Failed to subscribe:', error);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      // Clear connection listeners
      connectionUnsubs.current.forEach(fn => fn?.());
      connectionUnsubs.current = [];
    };
  }, [jobId, options]);

  // Cancel job
  const cancel = useCallback(() => {
    if (jobId) {
      try {
        const socket = getSocketClient();
        socket.cancelJob(jobId);
      } catch (error) {
        console.error('[useJobProgress] Failed to cancel job:', error);
      }
    }
  }, [jobId]);

  return {
    state,
    cancel,
    isStreaming,
    streamingText,
    connection,
  };
}

/**
 * Hook for managing multiple jobs
 */
export function useJobProgressMultiple(jobIds: string[]) {
  const [states, setStates] = useState<Map<string, JobProgressState>>(new Map());

  const subscriptions = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    try {
      const socket = getSocketClient();

      jobIds.forEach(jobId => {
        // Skip if already subscribed
        if (subscriptions.current.has(jobId)) {
          return;
        }

        const unsubscribe = socket.subscribeToJob(
          jobId,
          (progressData: any) => {
            setStates(prev => {
              const updated = new Map(prev);
              updated.set(jobId, {
                jobId,
                state: progressData.state || 'running',
                progress: progressData.progress || 0,
                step: progressData.step || 'Processing...',
                isComplete: progressData.state === 'completed',
                isFailed: progressData.state === 'failed',
              });
              return updated;
            });
          },
          () => {
            setStates(prev => {
              const updated = new Map(prev);
              const job = updated.get(jobId);
              if (job) {
                updated.set(jobId, { ...job, state: 'completed', isComplete: true });
              }
              return updated;
            });
          },
          () => {
            setStates(prev => {
              const updated = new Map(prev);
              const job = updated.get(jobId);
              if (job) {
                updated.set(jobId, { ...job, state: 'failed', isFailed: true });
              }
              return updated;
            });
          }
        );

        subscriptions.current.set(jobId, unsubscribe);
      });
    } catch (error) {
      console.error('[useJobProgressMultiple] Failed to subscribe:', error);
    }

    return () => {
      // Cleanup removed job subscriptions
      subscriptions.current.forEach((unsubscribe, jobId) => {
        if (!jobIds.includes(jobId)) {
          unsubscribe();
          subscriptions.current.delete(jobId);
        }
      });
    };
  }, [jobIds]);

  return states;
}
