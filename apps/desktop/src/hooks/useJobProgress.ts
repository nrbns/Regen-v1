/**
 * useJobProgress Hook
 * React hook for subscribing to and managing job progress
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocketClient } from '../services/socket';
import { tabManager } from '../services/tabManager';
import type { JobState } from '../../../packages/shared/events';
import { fetchJob } from '../services/jobs';

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
  lastSequence: number;
} {
  const [state, setState] = useState<JobProgressState | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastSequence, setLastSequence] = useState(0);
  const [connection, setConnection] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    socketStatus: 'disconnected' as 'connected' | 'connecting' | 'disconnected',
    retryCount: 0,
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const connectionUnsubs = useRef<Array<() => void>>([]);
  const jobSocketListeners = useRef<Array<() => void>>([]); // Track job-specific listeners

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
      try {
        if (tabManager.getActiveJob() != null) {
          tabManager.clearActiveJob();
        }
      } catch {}
      return;
    }

    // Reset streaming buffer on job change
    setStreamingText('');
    setIsStreaming(false);

    async function bootstrapJob() {
      try {
        const socket = getSocketClient();

        // Fetch latest job state immediately for resume-after-refresh
        try {
          const jobDetails = await fetchJob(jobId);
          const initialState: JobProgressState = {
            jobId,
            state: jobDetails.state as JobState,
            progress: jobDetails.progress ?? 0,
            step: jobDetails.step ?? 'Processing...?',
            isComplete: jobDetails.state === 'completed',
            isFailed: jobDetails.state === 'failed',
            error: jobDetails.error,
          };
          setState(initialState);
          // Reset streaming buffer on resume fetch
          setStreamingText('');
          setIsStreaming(false);
        } catch (fetchErr) {
          console.warn('[useJobProgress] Failed to bootstrap job state', fetchErr);
        }

        // Set active job for this tab (session restore + isolation)
        try {
          tabManager.setActiveJob(jobId);
        } catch {}

        // Subscribe to job
        unsubscribeRef.current = socket.subscribeToJob(
          jobId,
          (progressData: any) => {
            const seq = progressData.sequence ?? lastSequence + 1;
            setLastSequence(seq);

            const newState: JobProgressState = {
              jobId,
              state: (progressData.state as JobState) || 'running',
              progress: progressData.progress || progressData?.payload?.progress?.percentage || 0,
              step:
                progressData.step || progressData?.payload?.progress?.message || 'Processing...',
              partial: progressData.partial,
              isComplete: progressData.state === 'completed',
              isFailed: progressData.state === 'failed',
            };

            setState(newState);

            // Handle streaming text (with buffer size limit to prevent memory bloat)
            if (progressData.partial || progressData?.payload?.chunk) {
              const chunk = progressData.partial || progressData?.payload?.chunk;
              const MAX_BUFFER_SIZE = 5000; // Keep last 5000 chars only
              setStreamingText(prev => {
                const combined = prev + chunk;
                if (combined.length > MAX_BUFFER_SIZE) {
                  // Keep most recent text to save memory
                  return combined.slice(-MAX_BUFFER_SIZE);
                }
                return combined;
              });
              setIsStreaming(true);
            }

            options.onProgress?.(newState);
          },
          (completeData: any) => {
            const seq = completeData?.sequence ?? lastSequence + 1;
            setLastSequence(seq);
            setState(prev =>
              prev ? { ...prev, state: 'completed', progress: 100, isComplete: true } : null
            );
            options.onComplete?.(completeData);
            setIsStreaming(false);
            try {
              if (tabManager.getActiveJob() === jobId) {
                tabManager.clearActiveJob();
              }
            } catch {}
          },
          (error: string) => {
            setState(prev => (prev ? { ...prev, state: 'failed', error, isFailed: true } : null));
            options.onError?.(error);
            setIsStreaming(false);
            try {
              if (tabManager.getActiveJob() === jobId) {
                tabManager.clearActiveJob();
              }
            } catch {}
          }
        );

        // Ask server to replay missed events after reconnect
        const unsubReconnect = socket.on('socket:connected', () => {
          if (lastSequence > 0) {
            socket.reconnectSync(jobId, lastSequence);
          }
        });
        jobSocketListeners.current.push(unsubReconnect);
      } catch (error) {
        console.error('[useJobProgress] Failed to subscribe:', error);
      }
    }

    bootstrapJob();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Clear active job if leaving subscription
      try {
        if (tabManager.getActiveJob() === jobId) {
          tabManager.clearActiveJob();
        }
      } catch {}
      // Clean up job-specific socket listeners
      jobSocketListeners.current.forEach(fn => fn?.());
      jobSocketListeners.current = [];
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
        try {
          if (tabManager.getActiveJob() === jobId) {
            tabManager.clearActiveJob();
          }
        } catch {}
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
    lastSequence,
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
