/**
 * Research Agent Pipeline
 * Complete end-to-end flow: Search → Fetch → Summarize → Report
 */
import { FastifyRequest, FastifyReply } from 'fastify';
export interface ResearchAgentQuery {
  query: string;
  maxResults?: number;
  language?: string;
  useOnDeviceAI?: boolean;
  includeCitations?: boolean;
  format?: 'report' | 'bullets' | 'summary';
}
export interface ResearchAgentResponse {
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
  citations?: Array<{
    text: string;
    url: string;
  }>;
  confidence: number;
  method: 'ondevice' | 'cloud' | 'hybrid';
  latency_ms: number;
  error?: string;
}
/**
 * Plan research task: Break down into steps
 * Uses advanced planner for better task decomposition
 */
export declare function planResearchTask(query: string): Array<{
  step: string;
  description: string;
}>;
/**
 * Execute research agent pipeline
 */
export declare function executeResearchAgent(
  request: FastifyRequest<{
    Body: ResearchAgentQuery;
  }>,
  reply: FastifyReply
): Promise<ResearchAgentResponse>;
