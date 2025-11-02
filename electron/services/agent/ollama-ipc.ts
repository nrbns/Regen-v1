/**
 * Ollama IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { OllamaCheckRequest, OllamaCheckResponse, OllamaListModelsRequest, OllamaListModelsResponse, AgentAskRequest, AgentAskResponse, DeepResearchRequest, DeepResearchResponse } from '../../shared/ipc/schema';
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
}

