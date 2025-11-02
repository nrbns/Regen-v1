/**
 * Enhanced Threat Scanner IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getEnhancedThreatScanner } from './enhanced-scanner';
import { getFileAnalyzer } from './file-analyzer';
import { getFingerprintLibrary } from './fingerprint-lib';
import { getThreatGraphService } from '../self-defense/threat-graph';

export function registerEnhancedThreatIpc(): void {
  registerHandler('threats:scanUrlEnhanced', z.object({ url: z.string() }), async (_event, request) => {
    const scanner = getEnhancedThreatScanner();
    const result = await scanner.scanUrl(request.url);
    return result;
  });

  registerHandler('threats:scanFileEnhanced', z.object({ filePath: z.string() }), async (_event, request) => {
    const scanner = getEnhancedThreatScanner();
    const result = await scanner.scanFile(request.filePath);
    return result;
  });

  registerHandler('threats:analyzeFile', z.object({ filePath: z.string() }), async (_event, request) => {
    const analyzer = getFileAnalyzer();
    const result = await analyzer.analyze(request.filePath);
    return result;
  });

  registerHandler('threats:detectFingerprint', z.object({
    html: z.string(),
    headers: z.record(z.string()),
  }), async (_event, request) => {
    const lib = getFingerprintLibrary();
    const technologies = lib.detectTechnologies(request.html, request.headers);
    return { technologies };
  });

  registerHandler('threats:getThreatGraph', z.object({}), async () => {
    const graph = getThreatGraphService();
    return { graph: graph.getGraph() };
  });

  registerHandler('threats:clearThreatGraph', z.object({}), async () => {
    const graph = getThreatGraphService();
    graph.clear();
    return { success: true };
  });
}

