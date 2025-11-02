/**
 * Citation Graph IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { CitationGraphExtractRequest, CitationGraphGetResponse, CitationGraphExportRequest } from '../../shared/ipc/schema';
import { getCitationGraph } from './citation-graph';

export function registerCitationGraphIpc(): void {
  registerHandler('citation:extract', CitationGraphExtractRequest, async (_event, request) => {
    const graph = getCitationGraph();
    await graph.extractFromText(request.text, request.url);
    return { success: true };
  });

  registerHandler('citation:get', z.object({}), async () => {
    const graph = getCitationGraph();
    const citationGraph = graph.getGraph();
    return citationGraph satisfies z.infer<typeof CitationGraphGetResponse>;
  });

  registerHandler('citation:export', CitationGraphExportRequest, async (_event, request) => {
    const graph = getCitationGraph();
    if (request.format === 'graphml') {
      return { content: graph.exportGraphML(), format: 'graphml' };
    } else {
      return { content: graph.exportJSON(), format: 'json' };
    }
  });

  registerHandler('citation:clear', z.object({}), async () => {
    const graph = getCitationGraph();
    graph.clear();
    return { success: true };
  });
}

