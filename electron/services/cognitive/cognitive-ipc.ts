/**
 * Cognitive Layer IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { CognitiveRecordPatternRequest, CognitiveGetSuggestionsRequest, CognitiveGetSuggestionsResponse, CognitiveGetPersonaResponse } from '../../shared/ipc/schema';
import { getPersonaLearningService } from './persona-learning';

export function registerCognitiveIpc(): void {
  registerHandler('cognitive:recordPattern', CognitiveRecordPatternRequest, async (_event, request) => {
    const service = getPersonaLearningService();
    service.recordPattern(request);
    return { success: true };
  });

  registerHandler('cognitive:getSuggestions', CognitiveGetSuggestionsRequest, async (_event, request) => {
    const service = getPersonaLearningService();
    const suggestions = await service.getSuggestions({
      currentUrl: request.currentUrl,
      recentActions: request.recentActions,
    });
    return suggestions satisfies z.infer<typeof CognitiveGetSuggestionsResponse>;
  });

  registerHandler('cognitive:getPersona', z.object({}), async () => {
    const service = getPersonaLearningService();
    const persona = await service.getPersonaSummary();
    return persona satisfies z.infer<typeof CognitiveGetPersonaResponse>;
  });

  registerHandler('cognitive:getGraph', z.object({}), async () => {
    const service = getPersonaLearningService();
    return { graph: service.getGraph() };
  });

  registerHandler('cognitive:clear', z.object({}), async () => {
    const service = getPersonaLearningService();
    service.clear();
    return { success: true };
  });
}

