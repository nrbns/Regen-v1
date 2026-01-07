export interface SearchLLMCitation {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export interface SearchLLMResponse {
  query: string;
  answer: string;
  citations: SearchLLMCitation[];
  raw_results: SearchLLMCitation[];
  timestamp: number;
  latency_ms?: number;
}

const SEARCH_PROXY_URL = import.meta.env.VITE_SEARCH_PROXY_URL || 'http://localhost:3001';

export async function fetchSearchLLM(query: string): Promise<SearchLLMResponse> {
  const res = await fetch(`${SEARCH_PROXY_URL}/api/search_llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to generate AI answer');
  }

  return res.json();
}

