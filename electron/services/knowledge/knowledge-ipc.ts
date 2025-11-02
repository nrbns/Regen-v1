/**
 * Knowledge Services IPC Handlers
 * Clustering and PDF parsing
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { ClusteringRequest, ClusteringResponse, PDFParseRequest, PDFParseResponse } from '../../shared/ipc/schema';
import { getClusteringService } from './clustering';
import { getPDFParser } from './pdf-parser';

export function registerKnowledgeIpc(): void {
  registerHandler('knowledge:cluster', ClusteringRequest, async (_event, request) => {
    const clustering = getClusteringService();
    const clusters = await clustering.clusterSources(request.sources, request.threshold);
    return { clusters } satisfies z.infer<typeof ClusteringResponse>;
  });

  registerHandler('knowledge:parsePDF', PDFParseRequest, async (_event, request) => {
    const parser = getPDFParser();
    const result = await parser.parsePDF(request.filePath);
    const bibtex = parser.generateBibTeX(result.metadata, result.citations);
    return {
      ...result,
      bibtex,
    } satisfies z.infer<typeof PDFParseResponse>;
  });

  registerHandler('knowledge:clusterCompare', z.object({
    cluster1Id: z.string(),
    cluster2Id: z.string(),
  }), async (_event, request) => {
    const clustering = getClusteringService();
    const comparison = clustering.compareClusters(request.cluster1Id, request.cluster2Id);
    return comparison;
  });

  registerHandler('knowledge:clustersList', z.object({}), async () => {
    const clustering = getClusteringService();
    return { clusters: clustering.getClusters() };
  });
}

