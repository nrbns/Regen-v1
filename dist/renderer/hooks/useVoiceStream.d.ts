/**
 * useVoiceStream Hook
 * React hook for real-time voice transcription via WebSocket
 */
interface VoiceTranscript {
    text: string;
    partial: boolean;
    timestamp: number;
    language?: string;
}
interface UseVoiceStreamOptions {
    sessionId?: string;
    wsUrl?: string;
    autoReconnect?: boolean;
    autoSendToAgent?: boolean;
    onTranscript?: (transcript: VoiceTranscript) => void;
    onFinalTranscript?: (text: string) => void;
    onError?: (error: string) => void;
}
interface UseVoiceStreamReturn {
    isConnected: boolean;
    isRecording: boolean;
    currentTranscript: string;
    startRecording: () => void;
    stopRecording: () => void;
    cancelRecording: () => void;
    sendAudioChunk: (chunk: ArrayBuffer | Blob) => void;
}
export declare function useVoiceStream(options?: UseVoiceStreamOptions): UseVoiceStreamReturn;
export {};
