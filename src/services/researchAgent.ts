/**
 * Research Agent Service (Frontend)
 * Client-side service for calling research agent API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

export interface ResearchAgentOptions {
  maxResults?: number;
  language?: string;
  useOnDeviceAI?: boolean;
  includeCitations?: boolean;
  format?: 'report' | 'bullets' | 'summary';
}

export interface ResearchAgentResult {
  success: boolean;
  query: string;
  summary: string;
  bullets?: string[];
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    relevance: number;
  }>;
  citations?: Array<{ text: string; url: string }>;
  confidence: number;
  method: 'ondevice' | 'cloud' | 'hybrid';
  latency_ms: number;
  error?: string;
}

/**
 * Execute research agent query
 */
export async function executeResearchAgent(
  query: string,
  options: ResearchAgentOptions = {}
): Promise<ResearchAgentResult> {
  const {
    maxResults = 5,
    language = 'en',
    useOnDeviceAI = false,
    includeCitations = true,
    format = 'report',
  } = options;

  try {
    const response = await fetch(`${API_BASE_URL}/api/agent/research/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        maxResults,
        language,
        useOnDeviceAI,
        includeCitations,
        format,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      query,
      summary: '',
      bullets: [],
      sources: [],
      confidence: 0,
      method: 'cloud',
      latency_ms: 0,
      error: error.message || 'Research agent request failed',
    };
  }
}

/**
 * Plan research task (returns steps)
 */
export function planResearchTask(query: string): Array<{ step: string; description: string }> {
  return [
    {
      step: 'search',
      description: `Search web for: "${query}"`,
    },
    {
      step: 'fetch',
      description: 'Fetch content from top results',
    },
    {
      step: 'summarize',
      description: 'Generate summary from fetched content',
    },
    {
      step: 'format',
      description: 'Format final research report',
    },
  ];
}

/**
 * Run research agent (alias for executeResearchAgent for backward compatibility)
 */
export const runResearchAgent = executeResearchAgent;

/**
 * Execute research agent action (alias for executeResearchAgent)
 */
export const executeResearchAgentAction = executeResearchAgent;
