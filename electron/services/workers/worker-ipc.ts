/**
 * Worker IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getScrapingWorker } from './scraping-worker';

export function registerWorkerIpc(): void {
  registerHandler('workers:scraping:run', z.object({
    id: z.string(),
    urls: z.array(z.string()),
    selectors: z.array(z.string()).optional(),
    pagination: z.object({
      maxPages: z.number(),
      nextSelector: z.string().optional(),
    }).optional(),
  }), async (_event, request) => {
    const worker = getScrapingWorker();
    const result = await worker.runTask(request);
    return result;
  });

  registerHandler('workers:scraping:runWithProgress', z.object({
    id: z.string(),
    urls: z.array(z.string()),
    selectors: z.array(z.string()).optional(),
  }), async (_event, request) => {
    const worker = getScrapingWorker();
    // Note: Progress would need to be streamed via IPC events
    const result = await worker.runTask(request);
    return result;
  });
}

