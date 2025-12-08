/**
 * Agent Client
 * Initializes window.agent for AgentConsole and other components
 */

import { agentApi } from './api-client';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (window as any).__API_BASE_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      'http://127.0.0.1:4000'
    : import.meta.env.VITE_API_BASE_URL ||
      'http://127.0.0.1:4000';

export interface AgentRun {
  id: string;
  query: string;
  status: string;
  result?: any;
  error?: string;
  createdAt: number;
}

class AgentClient {
  private runs: Map<string, AgentRun> = new Map();
  private tokenHandlers: Set<(token: any) => void> = new Set();
  private stepHandlers: Set<(step: any) => void> = new Set();
  private currentRunId: string | null = null;
  private ws: WebSocket | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Initialize window.agent
    (window as any).agent = {
      start: this.start.bind(this),
      stop: this.stop.bind(this),
      runs: this.getRuns.bind(this),
      getRun: this.getRun.bind(this),
      onToken: this.onToken.bind(this),
      onStep: this.onStep.bind(this),
    };
  }

  async start(dsl: any): Promise<string> {
    try {
      const query = typeof dsl === 'string' ? dsl : dsl.goal || JSON.stringify(dsl);
      
      // Use agent API
      const response = await agentApi.query({ query });
      
      const runId = response.id || `run-${Date.now()}`;
      this.currentRunId = runId;

      const run: AgentRun = {
        id: runId,
        query,
        status: 'running',
        createdAt: Date.now(),
      };

      this.runs.set(runId, run);

      // Connect WebSocket for streaming if available
      this.connectWebSocket(runId);

      return runId;
    } catch (error: any) {
      console.error('[AgentClient] Start failed:', error);
      throw error;
    }
  }

  async stop(runId: string): Promise<void> {
    try {
      const run = this.runs.get(runId);
      if (run) {
        run.status = 'stopped';
        this.runs.set(runId, run);
      }

      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    } catch (error: any) {
      console.error('[AgentClient] Stop failed:', error);
    }
  }

  async getRuns(): Promise<AgentRun[]> {
    try {
      const runs = await agentApi.runs();
      return (runs || []).map((r: any) => ({
        id: r.id || `run-${Date.now()}`,
        query: r.query || r.goal || '',
        status: r.status || 'completed',
        result: r.result,
        error: r.error,
        createdAt: r.createdAt || r.startedAt || Date.now(),
      }));
    } catch (error: any) {
      console.warn('[AgentClient] Failed to fetch runs, using local cache:', error);
      return Array.from(this.runs.values());
    }
  }

  async getRun(runId: string): Promise<AgentRun | null> {
    try {
      const status = await agentApi.status(runId);
      if (status) {
        return {
          id: runId,
          query: status.query || '',
          status: status.state || status.status || 'unknown',
          result: status.result,
          error: status.error,
          createdAt: status.createdAt || Date.now(),
        };
      }
    } catch (error: any) {
      console.warn('[AgentClient] Failed to fetch run status:', error);
    }

    return this.runs.get(runId) || null;
  }

  onToken(handler: (token: any) => void) {
    this.tokenHandlers.add(handler);
    return () => this.tokenHandlers.delete(handler);
  }

  onStep(handler: (step: any) => void) {
    this.stepHandlers.add(handler);
    return () => this.stepHandlers.delete(handler);
  }

  private connectWebSocket(runId: string) {
    try {
      const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const url = `${wsUrl}/api/agent/stream?runId=${runId}`;

      this.ws = new WebSocket(url);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'token') {
            this.tokenHandlers.forEach(handler => {
              try {
                handler({ type: 'token', text: data.text || data.content });
              } catch (error) {
                console.warn('[AgentClient] Token handler error:', error);
              }
            });
          } else if (data.type === 'step') {
            this.stepHandlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.warn('[AgentClient] Step handler error:', error);
              }
            });
          }
        } catch (error) {
          console.warn('[AgentClient] Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('[AgentClient] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    } catch (error) {
      console.warn('[AgentClient] Failed to connect WebSocket:', error);
      // Continue without WebSocket - will use polling instead
    }
  }
}

// Initialize agent client
if (typeof window !== 'undefined') {
  new AgentClient();
  console.log('[AgentClient] Initialized window.agent');
}

export default AgentClient;

