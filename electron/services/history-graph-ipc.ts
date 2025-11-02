/**
 * History Graph IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';
import { HistoryGraphRecordNavigationRequest, HistoryGraphGetRequest } from '../shared/ipc/schema';
import { getHistoryGraphService } from './history-graph';

export function registerHistoryGraphIpc(): void {
  registerHandler('history-graph:recordNavigation', HistoryGraphRecordNavigationRequest, async (_event, request) => {
    const service = getHistoryGraphService();
    service.recordNavigation(request.fromUrl, request.toUrl, request.title);
    return { success: true };
  });

  registerHandler('history-graph:recordCitation', z.object({
    sourceUrl: z.string(),
    targetUrl: z.string(),
  }), async (_event, request) => {
    const service = getHistoryGraphService();
    service.recordCitation(request.sourceUrl, request.targetUrl);
    return { success: true };
  });

  registerHandler('history-graph:recordExport', z.object({
    sourceUrl: z.string(),
    exportType: z.string(),
    filename: z.string(),
  }), async (_event, request) => {
    const service = getHistoryGraphService();
    service.recordExport(request.sourceUrl, request.exportType, request.filename);
    return { success: true };
  });

  registerHandler('history-graph:recordNote', z.object({
    url: z.string(),
    noteText: z.string(),
  }), async (_event, request) => {
    const service = getHistoryGraphService();
    service.recordNote(request.url, request.noteText);
    return { success: true };
  });

  registerHandler('history-graph:get', HistoryGraphGetRequest, async (_event, request) => {
    const service = getHistoryGraphService();
    if (request.startTime && request.endTime) {
      const graph = service.getGraphInRange(request.startTime, request.endTime);
      return { graph };
    }
    const graph = service.getGraph();
    return { graph };
  });

  registerHandler('history-graph:export', z.object({
    format: z.enum(['json', 'graphml']).default('json'),
  }), async (_event, request) => {
    const service = getHistoryGraphService();
    if (request.format === 'graphml') {
      return { content: service.exportGraphML(), format: 'graphml' };
    } else {
      return { content: JSON.stringify(service.getGraph(), null, 2), format: 'json' };
    }
  });

  registerHandler('history-graph:clear', z.object({}), async () => {
    const service = getHistoryGraphService();
    service.clear();
    return { success: true };
  });
}

