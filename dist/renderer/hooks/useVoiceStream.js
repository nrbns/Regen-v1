/**
 * useVoiceStream Hook
 * React hook for real-time voice transcription via WebSocket
 */
import { useState, useEffect, useRef, useCallback } from 'react';
const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws/voice';
export function useVoiceStream(options = {}) {
    const { sessionId: initialSessionId, wsUrl = DEFAULT_WS_URL, autoReconnect = true, autoSendToAgent = false, onTranscript, onFinalTranscript, onError, } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const wsRef = useRef(null);
    const sessionIdRef = useRef(initialSessionId || `voice-${Date.now()}`);
    const reconnectTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    /**
     * Connect to WebSocket
     */
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }
        const url = `${wsUrl}?sessionId=${sessionIdRef.current}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
            console.log('[useVoiceStream] WebSocket connected');
            setIsConnected(true);
        };
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case 'connected':
                        console.log('[useVoiceStream] Connected to voice stream');
                        break;
                    case 'recording:started':
                        setIsRecording(true);
                        break;
                    case 'recording:stopped':
                        setIsRecording(false);
                        break;
                    case 'recording:cancelled':
                        setIsRecording(false);
                        setCurrentTranscript('');
                        break;
                    case 'transcript:partial':
                        setCurrentTranscript(message.text);
                        onTranscript?.({
                            text: message.text,
                            partial: true,
                            timestamp: message.timestamp,
                        });
                        break;
                    case 'transcript:final':
                        setCurrentTranscript(message.text);
                        onTranscript?.({
                            text: message.text,
                            partial: false,
                            timestamp: message.timestamp,
                            language: message.language,
                        });
                        onFinalTranscript?.(message.text);
                        break;
                    case 'transcript:error':
                        onError?.(message.error);
                        break;
                    case 'agent:task:started':
                        console.log('[useVoiceStream] Task sent to agent:', message.taskId);
                        break;
                }
            }
            catch (error) {
                console.error('[useVoiceStream] Error parsing message:', error);
            }
        };
        ws.onclose = () => {
            console.log('[useVoiceStream] WebSocket disconnected');
            setIsConnected(false);
            setIsRecording(false);
            if (autoReconnect) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('[useVoiceStream] Attempting to reconnect...');
                    connect();
                }, 3000);
            }
        };
        ws.onerror = (error) => {
            console.error('[useVoiceStream] WebSocket error:', error);
            onError?.('WebSocket connection error');
        };
    }, [wsUrl, autoReconnect, onTranscript, onFinalTranscript, onError]);
    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [connect]);
    /**
     * Start recording
     */
    const startRecording = useCallback(async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
            });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    // Send audio chunk to WebSocket
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(event.data);
                    }
                }
            };
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
            };
            // Start recording
            mediaRecorder.start(500); // Send chunks every 500ms
            // Notify server
            wsRef.current.send(JSON.stringify({
                type: 'start',
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
            onError?.(errorMessage);
            throw error;
        }
    }, [onError]);
    /**
     * Stop recording
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'stop',
                autoSendToAgent,
            }));
        }
    }, [autoSendToAgent]);
    /**
     * Cancel recording
     */
    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'cancel',
            }));
        }
        setCurrentTranscript('');
    }, []);
    /**
     * Send audio chunk manually
     */
    const sendAudioChunk = useCallback((chunk) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(chunk);
        }
    }, []);
    return {
        isConnected,
        isRecording,
        currentTranscript,
        startRecording,
        stopRecording,
        cancelRecording,
        sendAudioChunk,
    };
}
