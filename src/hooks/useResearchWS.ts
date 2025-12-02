/**
 * useResearchWS Hook
 * React hook to connect to WebSocket and subscribe to research job events
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ResearchEvent {
  id: string;
  jobId: string;
  type: 'research.event' | 'subscribed';
  eventType?: string;
  data?: any;
  timestamp: number;
}

export interface ResearchWSState {
  connected: boolean;
  events: ResearchEvent[];
  streamedAnswer: string;
  sources: Array<{ url: string; title: string; snippet: string; source: string; score: number }>;
  reasoningSteps: Array<{ step: number; text: string; citations: number[] }>;
  citations: Array<{ id: number; url: string; title: string; position: number }>;
  done: boolean;
  error: string | null;
}

/**
 * Hook to subscribe to research job events via WebSocket
 */
export function useResearchWS(jobId: string | null) {
  const [state, setState] = useState<ResearchWSState>({
    connected: false,
    events: [],
    streamedAnswer: '',
    sources: [],
    reasoningSteps: [],
    citations: [],
    done: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!jobId) return;

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || window.location.host;
    const wsUrl = `${protocol}//${host}/agent/stream?clientId=research-${Date.now()}&sessionId=research-session`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useResearchWS] ✓ WebSocket connected');
        setState(prev => ({ ...prev, connected: true, error: null }));
        reconnectAttempts.current = 0;

        // Subscribe to jobId
        const subscribeMsg = { type: 'subscribe', jobId };
        console.log('[useResearchWS] Sending subscribe message:', subscribeMsg);
        ws.send(JSON.stringify(subscribeMsg));
      };

      ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data) as ResearchEvent;
          console.log('[useResearchWS] Received message:', {
            type: msg.type,
            eventType: msg.eventType,
            jobId: msg.jobId,
            expectedJobId: jobId,
          });

          // Handle subscription confirmation
          if (msg.type === 'subscribed' && msg.jobId === jobId) {
            console.log('[useResearchWS] ✓ Subscribed to job', jobId);
            return;
          }

          // Handle research events
          if (msg.type === 'research.event' && msg.jobId === jobId) {
            console.log('[useResearchWS] Processing research event:', msg.eventType);
            setState(prev => {
              const newEvents = [...prev.events, msg];
              let newState = { ...prev, events: newEvents };

              // Handle different event types
              switch (msg.eventType) {
                case 'started':
                  newState = { ...newState, streamedAnswer: '', done: false };
                  break;

                case 'sources':
                  if (msg.data?.sources) {
                    newState = { ...newState, sources: msg.data.sources };
                  }
                  break;

                case 'chunk':
                  if (msg.data?.token) {
                    newState = {
                      ...newState,
                      streamedAnswer: prev.streamedAnswer + msg.data.token,
                    };
                  }
                  break;

                case 'done':
                  if (msg.data) {
                    newState = {
                      ...newState,
                      streamedAnswer:
                        msg.data.answer || msg.data.fullResponse || prev.streamedAnswer,
                      reasoningSteps: msg.data.reasoningSteps || [],
                      citations: msg.data.citations || [],
                      done: true,
                    };
                  }
                  break;

                case 'reasoning':
                  if (msg.data?.steps) {
                    newState = { ...newState, reasoningSteps: msg.data.steps };
                  }
                  break;

                case 'error':
                  newState = { ...newState, error: msg.data?.error || 'Unknown error', done: true };
                  break;
              }

              return newState;
            });
          }
        } catch (error) {
          console.error('[useResearchWS] Failed to parse message', error);
        }
      };

      ws.onclose = event => {
        console.log('[useResearchWS] WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setState(prev => ({ ...prev, connected: false }));

        // Attempt reconnection if job is not done
        if (!state.done && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[useResearchWS] Reconnecting (attempt ${reconnectAttempts.current})...`);
            connect();
          }, 1000 * reconnectAttempts.current); // Exponential backoff
        }
      };

      ws.onerror = error => {
        console.error('[useResearchWS] ✗ WebSocket error', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
      };
    } catch (error) {
      console.error('[useResearchWS] Failed to create WebSocket', error);
      setState(prev => ({ ...prev, error: 'Failed to connect' }));
    }
  }, [jobId, state.done]);

  useEffect(() => {
    if (!jobId) {
      console.log('[useResearchWS] No jobId provided, resetting state');
      // Reset state when jobId is cleared
      setState({
        connected: false,
        events: [],
        streamedAnswer: '',
        sources: [],
        reasoningSteps: [],
        citations: [],
        done: false,
        error: null,
      });
      return;
    }

    console.log('[useResearchWS] Connecting for jobId:', jobId);
    connect();

    return () => {
      console.log('[useResearchWS] Cleaning up connection for jobId:', jobId);
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // Ignore close errors
        }
      }
    };
  }, [jobId, connect]);

  return state;
}
