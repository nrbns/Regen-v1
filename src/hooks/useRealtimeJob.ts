/**
 * React hook for realtime job execution
 *
 * Makes it easy to start jobs and track their progress in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { getSocketService } from '../services/realtimeSocket';

interface UseRealtimeJobOptions {
  autoConnect?: boolean;
  serverUrl?: string;
  token?: string;
}

interface JobState {
  jobId: string | null;
  status: 'idle' | 'connecting' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
    message?: string;
  } | null;
  chunks: string[];
  result: any;
  error: string | null;
  isOnline: boolean;
  lastCheckpoint?: { sequence: number; partialOutput: any } | null;
}

export function useRealtimeJob(options: UseRealtimeJobOptions = {}) {
  const [state, setState] = useState<JobState>({
    jobId: null,
    status: 'idle',
    progress: null,
    chunks: [],
    result: null,
    error: null,
    isOnline: false,
    lastCheckpoint: null,
  });

  // Initialize socket connection
  useEffect(() => {
    if (!options.autoConnect || !options.serverUrl || !options.token) return;

    const initSocket = async () => {
      try {
        const socketService = getSocketService({
          serverUrl: options.serverUrl!,
          autoConnect: false,
        });

        await socketService.connect(options.token!);

        setState(prev => ({ ...prev, isOnline: true, status: 'idle' }));
      } catch (error) {
        console.error('[useRealtimeJob] Connection failed:', error);
        setState(prev => ({ ...prev, error: 'Failed to connect to server' }));
      }
    };

    initSocket();
  }, [options.autoConnect, options.serverUrl, options.token]);

  // Subscribe to connection status
  useEffect(() => {
    try {
      const socketService = getSocketService();

      const unsubscribe = socketService.onStatusChange(status => {
        setState(prev => ({ ...prev, isOnline: status === 'online' }));
      });

      return unsubscribe;
    } catch {
      // Socket not initialized yet
    }
  }, []);

  // Subscribe to job events when jobId changes
  useEffect(() => {
    if (!state.jobId) return;

    try {
      const socketService = getSocketService();

      // Subscribe to job
      socketService.subscribeToJob(state.jobId);

      // Setup listeners
      const unsubChunk = socketService.onJobChunk(state.jobId, data => {
        setState(prev => ({
          ...prev,
          chunks: [...prev.chunks, data.payload.chunk],
        }));
      });

      const unsubProgress = socketService.onJobProgress(state.jobId, data => {
        setState(prev => ({
          ...prev,
          progress: data.payload.progress,
        }));
      });

      const unsubComplete = socketService.onJobComplete(state.jobId, data => {
        setState(prev => ({
          ...prev,
          status: 'completed',
          result: data.payload.result,
        }));
      });

      const unsubFail = socketService.onJobFail(state.jobId, data => {
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: data.payload.error || 'Job failed',
        }));
      });

      const unsubCheckpoint = socketService.onJobCheckpoint(state.jobId, data => {
        setState(prev => ({
          ...prev,
          lastCheckpoint: {
            sequence: data.sequence,
            partialOutput: data.payload.checkpoint?.partialOutput,
          },
        }));
      });

      return () => {
        unsubChunk();
        unsubProgress();
        unsubComplete();
        unsubFail();
        unsubCheckpoint();
        socketService.unsubscribeFromJob(state.jobId!);
      };
    } catch (error) {
      console.error('[useRealtimeJob] Failed to setup listeners:', error);
    }
  }, [state.jobId]);

  // Start a new job
  const startJob = useCallback(async (payload: { type: string; input: any }) => {
    try {
      setState(prev => ({
        ...prev,
        status: 'connecting',
        error: null,
        chunks: [],
        progress: null,
        result: null,
      }));

      const socketService = getSocketService();

      if (!socketService.isConnected()) {
        throw new Error('Not connected to server');
      }

      const jobId = await socketService.startJob(payload);

      setState(prev => ({
        ...prev,
        jobId,
        status: 'running',
      }));

      return jobId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start job';
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // Cancel current job
  const cancelJob = useCallback(async () => {
    if (!state.jobId) return;

    try {
      const socketService = getSocketService();
      await socketService.cancelJob(state.jobId);

      setState(prev => ({
        ...prev,
        status: 'cancelled',
      }));
    } catch (error) {
      console.error('[useRealtimeJob] Failed to cancel job:', error);
    }
  }, [state.jobId]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      jobId: null,
      status: 'idle',
      progress: null,
      chunks: [],
      result: null,
      error: null,
      isOnline: state.isOnline,
    });
  }, [state.isOnline]);

  return {
    // State
    jobId: state.jobId,
    status: state.status,
    progress: state.progress,
    chunks: state.chunks,
    result: state.result,
    error: state.error,
    isOnline: state.isOnline,
    lastCheckpoint: state.lastCheckpoint,

    // Actions
    startJob,
    cancelJob,
    reset,

    // Computed
    isRunning: state.status === 'running',
    isComplete: state.status === 'completed',
    isFailed: state.status === 'failed',
    isCancelled: state.status === 'cancelled',
  };
}

/**
 * Example usage:
 *
 * ```tsx
 * function MyComponent() {
 *   const job = useRealtimeJob({
 *     autoConnect: true,
 *     serverUrl: 'ws://localhost:3000',
 *     token: 'jwt-token',
 *   });
 *
 *   const handleStart = async () => {
 *     await job.startJob({
 *       type: 'llm-completion',
 *       input: { prompt: 'Write a poem' },
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleStart} disabled={job.isRunning}>
 *         Start Job
 *       </button>
 *
 *       {job.isRunning && (
 *         <>
 *           <div>Progress: {job.progress?.percentage}%</div>
 *           <div>Output: {job.chunks.join('')}</div>
 *           <button onClick={job.cancelJob}>Cancel</button>
 *         </>
 *       )}
 *
 *       {job.isComplete && <div>Result: {job.result}</div>}
 *       {job.isFailed && <div>Error: {job.error}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
