/* eslint-env node */
/**
 * Summarization API
 * Extracts content from URLs and generates LLM summaries with streaming support
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { extractMultipleContent } from '../lib/extractors.js';
import { summaryCache, contentCache, getSummaryCacheKey, getContentCacheKey } from '../lib/cache.js';
import { getLLM } from '../core/llm-provider.js';

// Note: On-device AI is handled in the frontend layer
// The summarize API will use on-device AI if called from Tauri frontend
// Cloud fallback is handled automatically via getLLM()

interface SummarizeQuery {
  urls: string | string[];
  query?: string; // Optional context query for focused summarization
  language?: string;
  maxLength?: number;
  includeBullets?: boolean;
  includeCitations?: boolean;
}

interface SummarizeResponse {
  ok: boolean;
  summaries: Array<{
    url: string;
    title: string;
    summary: string;
    bullets?: string[];
    excerpt?: string;
    citations?: Array<{ url: string; title: string }>;
    model?: string;
    tokensUsed?: number;
    error?: string;
  }>;
  cached: boolean;
  latency_ms: number;
}

/**
 * Generate summary using LLM
 */
async function generateSummary(
  content: { url: string; title: string; text: string; excerpt?: string },
  options: { query?: string; language?: string; includeBullets?: boolean; maxLength?: number }
): Promise<{
  summary: string;
  bullets?: string[];
  model: string;
  tokensUsed?: number;
}> {
  const { query, language = 'en', includeBullets = true, maxLength = 500 } = options;

  // Truncate content if too long (leave room for prompt)
  const maxContentLength = Math.min(content.text.length, 8000);
  const truncatedText = content.text.slice(0, maxContentLength);

  // Build prompt
  let prompt = `Please provide a comprehensive summary of the following article:\n\n`;
  prompt += `Title: ${content.title}\n\n`;
  prompt += `Content:\n${truncatedText}\n\n`;

  if (query) {
    prompt += `Focus the summary on: ${query}\n\n`;
  }

  prompt += `Requirements:\n`;
  prompt += `- Write in ${language === 'auto' ? 'English' : language}\n`;
  prompt += `- Summary should be ${maxLength} words or less\n`;
  prompt += `- Be concise but comprehensive\n`;
  prompt += `- Focus on key facts and main points\n`;

  if (includeBullets) {
    prompt += `- Include 3-5 bullet points highlighting the most important information\n`;
  }

  prompt += `\nProvide your summary${includeBullets ? ' and bullet points' : ''}:`;

  // On-device AI is handled in frontend (src/services/onDeviceAI.ts)
  // Frontend will call this API only after trying on-device first
  // So we proceed directly to cloud LLM here
  try {
    const llm = await getLLM({
      temperature: 0.3, // Lower temperature for more factual summaries
      maxTokens: 800,
    });

    const result = await llm.call(prompt, {
      maxTokens: 800,
      temperature: 0.3,
    });

    // Parse response to extract summary and bullets
    let summary = result.text || '';
    let bullets: string[] | undefined;

    if (includeBullets) {
      // Try to extract bullets (lines starting with -, •, or numbers)
      const bulletRegex = /(?:^|\n)[-•\d+\.]\s*(.+?)(?=\n|$)/g;
      const matches = summary.match(bulletRegex);
      
      if (matches && matches.length >= 2) {
        bullets = matches
          .slice(0, 5) // Max 5 bullets
          .map(b => b.replace(/^[-•\d+\.]\s*/, '').trim())
          .filter(b => b.length > 0);
        
        // Remove bullets from summary text
        summary = summary.replace(bulletRegex, '').trim();
      }
    }

    return {
      summary: summary.trim() || result.text || 'Unable to generate summary',
      bullets,
      model: result.model || 'unknown',
      tokensUsed: result.usage?.total_tokens || 0,
    };
  } catch (error: any) {
    console.error('[SummarizeAPI] LLM call failed:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

/**
 * POST /api/summarize
 * Summarize one or more URLs
 */
export async function summarizeHandler(
  request: FastifyRequest<{ Body: SummarizeQuery }>,
  reply: FastifyReply
): Promise<SummarizeResponse> {
  const startTime = Date.now();
  let cached = false;

  try {
    const {
      urls: urlsInput,
      query,
      language = 'auto',
      maxLength = 500,
      includeBullets = true,
      includeCitations = true,
    } = request.body;

    // Normalize URLs to array
    const urls = Array.isArray(urlsInput) ? urlsInput : [urlsInput];
    
    if (urls.length === 0) {
      return reply.code(400).send({
        ok: false,
        error: 'invalid_request',
        message: 'At least one URL is required',
      }) as any;
    }

    // Validate URLs
    const validUrls = urls.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return reply.code(400).send({
        ok: false,
        error: 'invalid_urls',
        message: 'No valid URLs provided',
      }) as any;
    }

    // Limit to 5 URLs per request (prevent abuse)
    const limitedUrls = validUrls.slice(0, 5);

    // Check cache
    const cacheKey = getSummaryCacheKey(limitedUrls);
    let summaries = summaryCache.get<SummarizeResponse['summaries']>(cacheKey);

    if (summaries) {
      cached = true;
    } else {
      // Extract content for all URLs
      const extractedContents = await extractMultipleContent(limitedUrls, {
        concurrency: 3,
        timeout: 10000,
        maxLength: 10000,
        extractMetadata: true,
      });

      // Generate summaries in parallel
      const summaryPromises = extractedContents.map(async (content) => {
        // Check content cache first
        const contentCacheKey = getContentCacheKey(content.url);
        const cachedContent = contentCache.get(contentCacheKey);

        if (cachedContent && !content.error) {
          // Use cached content
          content = { ...content, ...cachedContent };
        } else if (!content.error && content.text) {
          // Cache extracted content
          contentCache.set(contentCacheKey, {
            title: content.title,
            text: content.text,
            excerpt: content.excerpt,
          }, 21600); // 6 hours
        }

        if (content.error || !content.text) {
          return {
            url: content.url,
            title: content.title || content.url,
            summary: `Unable to extract content: ${content.error || 'No content found'}`,
            error: content.error || 'No content',
          };
        }

        try {
          const summaryResult = await generateSummary(content, {
            query,
            language,
            includeBullets,
            maxLength,
          });

          // Build citations if requested
          let citations: Array<{ url: string; title: string }> | undefined;
          if (includeCitations && content.metadata) {
            citations = [{
              url: content.url,
              title: content.title,
            }];
          }

          return {
            url: content.url,
            title: content.title,
            summary: summaryResult.summary,
            bullets: summaryResult.bullets,
            excerpt: content.excerpt,
            citations,
            model: summaryResult.model,
            tokensUsed: summaryResult.tokensUsed,
          };
        } catch (error: any) {
          console.error(`[SummarizeAPI] Failed to summarize ${content.url}:`, error);
          return {
            url: content.url,
            title: content.title,
            summary: `Summary generation failed: ${error.message}`,
            error: error.message,
          };
        }
      });

      summaries = await Promise.all(summaryPromises);

      // Cache summaries (24 hour TTL)
      if (summaries.every(s => !s.error)) {
        summaryCache.set(cacheKey, summaries, 86400);
      }
    }

    const latency = Date.now() - startTime;

    const response: SummarizeResponse = {
      ok: true,
      summaries,
      cached,
      latency_ms: latency,
    };

    return reply.send(response);
  } catch (error: any) {
    console.error('[SummarizeAPI] Unexpected error:', error);
    return reply.code(500).send({
      ok: false,
      error: 'internal_error',
      message: error.message || 'Internal server error',
      latency_ms: Date.now() - startTime,
    }) as any;
  }
}

/**
 * Stream summary generation (SSE)
 */
export async function summarizeStreamHandler(
  request: FastifyRequest<{ Body: SummarizeQuery }>,
  reply: FastifyReply
): Promise<void> {
  // For now, return regular response
  // TODO: Implement streaming with Fastify SSE plugin
  return summarizeHandler(request, reply) as any;
}

