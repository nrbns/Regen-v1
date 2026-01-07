/**
 * Research Agent Pipeline
 * Complete end-to-end flow: Search → Fetch → Summarize → Report
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { extractContent } from '../lib/extractors.js';
import { cache } from '../lib/cache.js';
import pLimit from 'p-limit';

// Import search function (will use production API)
async function performSearch(query: string, options: { maxResults: number; lang?: string }) {
  const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
  const response = await fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: query,
      maxResults: options.maxResults,
      lang: options.lang,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

// Dynamic import for on-device AI (only works in Tauri context)
async function trySummarizeOnDevice(text: string, options: any) {
  try {
    // This will only work in frontend/Tauri context
    // For server-side, we'll always use cloud
    const { summarizeOnDevice } = await import('../../src/services/onDeviceAI.js');
    return await summarizeOnDevice(text, options);
  } catch {
    return null; // On-device AI not available in server context
  }
}

const CONCURRENCY_LIMIT = 3;
const fetchLimiter = pLimit(CONCURRENCY_LIMIT);

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
  citations?: Array<{ text: string; url: string }>;
  confidence: number;
  method: 'ondevice' | 'cloud' | 'hybrid';
  latency_ms: number;
  error?: string;
}

/**
 * Plan research task: Break down into steps
 * Uses advanced planner for better task decomposition
 */
export function planResearchTask(query: string): Array<{ step: string; description: string }> {
  // Try to use advanced planner if available
  try {
    const { planResearchTask: advancedPlan } = require('./advanced-planner');
    const plan = advancedPlan(query, { complexity: 'medium' });
    return plan.steps.map((s: any) => ({
      step: s.type,
      description: s.description,
    }));
  } catch {
    // Fallback to simple plan
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
}

/**
 * Execute research agent pipeline
 */
export async function executeResearchAgent(
  request: FastifyRequest<{ Body: ResearchAgentQuery }>,
  reply: FastifyReply
): Promise<ResearchAgentResponse> {
  const startTime = Date.now();
  const {
    query,
    maxResults = 5,
    language = 'en',
    useOnDeviceAI = false,
    includeCitations = true,
    format = 'report',
  } = request.body;

  if (!query || query.trim().length < 2) {
    return reply.code(400).send({
      success: false,
      error: 'Query must be at least 2 characters',
    }) as any;
  }

  try {
    // Step 1: Search
    request.log.info(`[ResearchAgent] Step 1: Searching for "${query}"`);
    const searchResults = await performSearch(query, {
      maxResults: maxResults * 2, // Get more results for better ranking
      lang: language,
    });

    if (!searchResults || searchResults.length === 0) {
      return {
        success: false,
        query,
        summary: 'No results found for your query.',
        sources: [],
        confidence: 0,
        method: 'cloud',
        latency_ms: Date.now() - startTime,
        error: 'No search results',
      };
    }

    // Step 2: Fetch and extract content
    request.log.info(
      `[ResearchAgent] Step 2: Fetching content from ${searchResults.length} sources`
    );
    const sourcesWithContent = await Promise.all(
      searchResults.slice(0, maxResults).map((result: any) =>
        fetchLimiter(async () => {
          try {
            const contentCacheKey = `content:${result.url}`;
            let content = cache.content.get(contentCacheKey) as string | undefined;

            if (!content) {
              const extracted = await extractContent(result.url);
              if (extracted.text) {
                content = extracted.text;
                cache.content.set(contentCacheKey, content);
              }
            }

            return {
              url: result.url,
              title: result.title || result.url,
              snippet: result.snippet || content?.slice(0, 200) || '',
              content: content || result.snippet || '',
              relevance: result.score || 0.5,
            };
          } catch (error: any) {
            request.log.warn(`[ResearchAgent] Failed to fetch ${result.url}:`, error.message);
            return {
              url: result.url,
              title: result.title || result.url,
              snippet: result.snippet || '',
              content: '',
              relevance: 0.3,
            };
          }
        })
      )
    );

    // Filter out sources without content
    const validSources = sourcesWithContent.filter(s => s.content && s.content.length > 100);

    if (validSources.length === 0) {
      return {
        success: false,
        query,
        summary: 'Unable to extract content from sources.',
        sources: sourcesWithContent.map(s => ({
          url: s.url,
          title: s.title,
          snippet: s.snippet,
          relevance: s.relevance,
        })),
        confidence: 0.3,
        method: 'cloud',
        latency_ms: Date.now() - startTime,
        error: 'No valid content extracted',
      };
    }

    // Step 3: Combine and summarize
    request.log.info(`[ResearchAgent] Step 3: Summarizing ${validSources.length} sources`);
    const combinedContent = validSources
      .map(
        (s, i) => `[Source ${i + 1}: ${s.title}]\n${s.content.slice(0, 2000)}` // Limit per source
      )
      .join('\n\n---\n\n');

    // Try on-device AI first if requested
    let summary: string = '';
    let bullets: string[] | undefined;
    let method: 'ondevice' | 'cloud' | 'hybrid' = 'cloud';

    if (useOnDeviceAI) {
      try {
        const onDeviceResult = await trySummarizeOnDevice(combinedContent, {
          maxLength: format === 'summary' ? 200 : 500,
          language,
        });

        if (onDeviceResult && onDeviceResult.method === 'ondevice') {
          summary = onDeviceResult.summary;
          method = 'ondevice';
        } else if (onDeviceResult) {
          // Fallback result from on-device service
          summary = onDeviceResult.summary;
          method = 'hybrid';
        }
      } catch (error: any) {
        request.log.warn('[ResearchAgent] On-device AI failed, using cloud:', error.message);
        // Fall through to cloud
      }
    }

    // Cloud summarization (if on-device not used or failed)
    if (!summary) {
      const { getLLM } = await import('../core/llm-provider.js');
      const llm = await getLLM({
        temperature: 0.3,
        maxTokens: format === 'summary' ? 400 : 800,
      });

      const prompt = `Based on the following sources, provide a comprehensive research summary for: "${query}"

${combinedContent}

Requirements:
- Write in ${language === 'auto' ? 'English' : language}
- Be concise but comprehensive
- Focus on key facts and main points
- ${format === 'bullets' ? 'Format as bullet points' : 'Write as a cohesive report'}
${includeCitations ? '- Include citations like [1], [2], etc.' : ''}

${format === 'report' ? 'Research Report:' : 'Summary:'}`;

      const llmResponse = await llm.call(prompt, {
        maxTokens: format === 'summary' ? 400 : 800,
        temperature: 0.3,
      });

      summary = llmResponse.text || 'Unable to generate summary';

      // Extract bullets if format is bullets
      if (format === 'bullets') {
        const bulletRegex = /(?:^|\n)[-•\d+\.]\s*(.+?)(?=\n|$)/g;
        const matches = summary.match(bulletRegex);
        if (matches && matches.length >= 2) {
          bullets = matches
            .slice(0, 10)
            .map(b => b.replace(/^[-•\d+\.]\s*/, '').trim())
            .filter(b => b.length > 0);
        }
      }
    }

    // Step 4: Format and add citations
    let citations: Array<{ text: string; url: string }> | undefined;
    if (includeCitations) {
      citations = validSources.map((source, index) => ({
        text: `[${index + 1}] ${source.title}`,
        url: source.url,
      }));
    }

    // Calculate confidence based on sources quality
    const avgRelevance =
      validSources.reduce((sum, s) => sum + s.relevance, 0) / validSources.length;
    const confidence = Math.min(0.95, 0.5 + avgRelevance * 0.5);

    const latency = Date.now() - startTime;

    request.log.info(
      `[ResearchAgent] Completed in ${latency}ms with ${validSources.length} sources`
    );

    return {
      success: true,
      query,
      summary,
      bullets,
      sources: validSources.map(s => ({
        url: s.url,
        title: s.title,
        snippet: s.snippet,
        relevance: s.relevance,
      })),
      citations,
      confidence,
      method,
      latency_ms: latency,
    };
  } catch (error: any) {
    request.log.error('[ResearchAgent] Error:', error);
    return reply.code(500).send({
      success: false,
      query,
      summary: '',
      sources: [],
      confidence: 0,
      method: 'cloud',
      latency_ms: Date.now() - startTime,
      error: error.message || 'Research agent failed',
    }) as any;
  }
}
