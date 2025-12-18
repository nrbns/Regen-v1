// Lightweight renderer-friendly useJobProgress stub
// Provides connection + lastSequence for UI without desktop dependencies
export interface JobProgressConnection {
  isOnline: boolean;
  socketStatus: 'connected' | 'connecting' | 'disconnected';
  retryCount: number;
}

export function useJobProgress(_jobId: string | null) {
  const connection: JobProgressConnection = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    socketStatus: 'connected',
    retryCount: 0,
  };

  return {
    state: null as any,
    cancel: () => {},
    isStreaming: false,
    streamingText: '',
    connection,
    lastSequence: 0,
  };
}
