/**
 * Agent Client - Frontend Integration
 * Calls Tauri commands for agent research and execution
 */

import { invoke } from '@tauri-apps/api/core';

export interface ResearchAgentRequest {
  query: string;
  url?: string;
  context?: string;
  mode?: 'local' | 'remote' | 'hybrid';
}

export interface ResearchAgentResponse {
  agent_version: string;
  summary: {
    short: string;
    bullets: string[];
    keywords: string[];
  };
  actions: Array<{
    id: string;
    type: string;
    label: string;
    payload: any;
  }>;
  confidence: number;
  explainability: string;
  citations: number;
  hallucination: 'low' | 'medium' | 'high';
  query: string;
  processing_time_ms?: number;
}

export interface ExecuteRequest {
  actions: Array<{
    id: string;
    type: string;
    label: string;
    payload: any;
  }>;
  session_id?: string;
  user_id?: string;
}

export interface ExecuteResponse {
  status: string;
  results: any[];
  errors?: any[];
  executed_at: string;
}

/**
 * Call research agent
 */
export async function researchAgent(request: ResearchAgentRequest): Promise<ResearchAgentResponse> {
  try {
    const response = await invoke<ResearchAgentResponse>('research_agent', { request });
    return response;
  } catch (error) {
    console.error('[Agent] Research failed:', error);
    throw error;
  }
}

/**
 * Execute agent actions
 */
export async function executeAgent(request: ExecuteRequest): Promise<ExecuteResponse> {
  try {
    const response = await invoke<ExecuteResponse>('execute_agent', { request });
    return response;
  } catch (error) {
    console.error('[Agent] Execution failed:', error);
    throw error;
  }
}

/**
 * Start streaming agent research
 */
export async function researchAgentStream(request: ResearchAgentRequest): Promise<void> {
  try {
    // Extract page text if URL provided
    let pageText: string | undefined;
    if (request.url) {
      try {
        const extracted = await invoke<{
          url: string;
          title: string;
          text: string;
          html_hash: string;
          word_count: number;
        }>('extract_page_text', { url: request.url });
        pageText = extracted.text;
      } catch (err) {
        console.warn('[Agent] Failed to extract page text:', err);
      }
    }

    await invoke('research_agent_stream', {
      request: {
        ...request,
        context: pageText ? pageText.substring(0, 2000) : request.context,
      },
    });
  } catch (error) {
    console.error('[Agent] Stream failed:', error);
    throw error;
  }
}

/**
 * Listen for agent events (Tauri window events)
 */
export async function onAgentEventStream(
  callback: (event: { type: string; payload: any }) => void
): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');

  const unlisten = await listen('agent-event', (event: any) => {
    callback(event.payload);
  });

  return unlisten;
}

/**
 * Listen for agent events (legacy window events)
 */
export function onAgentEvent(
  event: 'agent-research-start' | 'agent-research-complete',
  callback: (data: any) => void
) {
  const handler = (event: CustomEvent) => {
    callback(event.detail);
  };

  window.addEventListener(event, handler as EventListener);

  return () => {
    window.removeEventListener(event, handler as EventListener);
  };
}
