/**
 * Ollama IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import {
  OllamaCheckRequest,
  OllamaCheckResponse,
  OllamaListModelsRequest,
  AgentAskRequest,
  AgentAskResponse,
  DeepResearchRequest,
  AgentAskWithScrapeRequest,
  AgentAskWithScrapeResponse,
} from '../../shared/ipc/schema';
import { getOllamaAdapter } from './ollama-adapter';
import { runDeepResearch } from './chains/deep-research';

export function registerOllamaIpc(): void {
  registerHandler('ollama:check', OllamaCheckRequest, async () => {
    const ollama = getOllamaAdapter();
    const available = await ollama.checkAvailable();
    const models = available ? await ollama.listModels() : undefined;

    return {
      available,
      models,
    } satisfies z.infer<typeof OllamaCheckResponse>;
  });

  registerHandler('ollama:listModels', OllamaListModelsRequest, async () => {
    const ollama = getOllamaAdapter();
    const models = await ollama.listModels();
    return { models };
  });

  registerHandler('agent:ask', AgentAskRequest, async (_event, request) => {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      throw new Error('Ollama is not available. Please start Ollama service.');
    }

    const messages = [];

    if (request.context?.url || request.context?.text) {
      messages.push({
        role: 'system' as const,
        content: 'You are a helpful assistant. Answer questions based on the provided context.',
      });

      let contextContent = '';
      if (request.context.url) {
        contextContent += `Source URL: ${request.context.url}\n\n`;
      }
      if (request.context.text) {
        contextContent += `Context:\n${request.context.text}`;
      }

      messages.push({
        role: 'user' as const,
        content: `${contextContent}\n\nQuestion: ${request.query}`,
      });
    } else {
      messages.push({
        role: 'user' as const,
        content: request.query,
      });
    }

    const answer = await ollama.chat(messages);

    return {
      answer,
      sources: request.context?.url ? [request.context.url] : undefined,
    } satisfies z.infer<typeof AgentAskResponse>;
  });

  registerHandler('agent:deepResearch', DeepResearchRequest, async (_event, request) => {
    const result = await runDeepResearch(request);
    return result;
  });

  registerHandler('agent:askWithScrape', AgentAskWithScrapeRequest, async (_event, request) => {
    const endpoint = process.env.AGENT_QUERY_ENDPOINT || 'http://127.0.0.1:4000/api/agent/query';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        url: request.url,
        question: request.question,
        task: request.task || 'qa',
        waitFor: request.waitFor || 8,
      }),
    });

    if (response.status === 202) {
      // Job enqueued, return status for polling
      const payload = await response.json();
      return {
        jobId: payload.jobId,
        status: 'enqueued' as const,
        message: payload.message,
      };
    }

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(
        `Agent scrape query failed (${response.status}): ${message || 'unknown-error'}`
      );
    }

    const payload = await response.json();

    // Handle new format with agentResult
    if (payload.agentResult) {
      return {
        jobId: payload.jobId,
        task: payload.task,
        status: 'complete' as const,
        answer: payload.agentResult.answer,
        summary: payload.agentResult.summary,
        highlights: payload.agentResult.highlights,
        model: payload.agentResult.model,
        sources: payload.agentResult.sources.map((s: { url: string }) => s.url),
        provenance: payload.agentResult.provenance,
        scrape: {
          status: payload.agentResult.provenance.status,
          cached: payload.agentResult.provenance.cached,
          fetchedAt: payload.agentResult.provenance.fetchedAt,
        },
      };
    }

    // Legacy format fallback
    return AgentAskWithScrapeResponse.parse(payload);
  });
}
