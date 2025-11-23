/**
 * OmniKernel IPC Handlers
 * Exposes unified API to renderer
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getOmniKernel } from './kernel';
import { BrowserWindow } from 'electron';

export function registerOmnixIpc(win: BrowserWindow) {
  const kernel = getOmniKernel(win);

  registerHandler('omnix:browser:getPage', z.object({}), async () => {
    return await kernel.browser.getPage();
  });

  registerHandler('omnix:browser:getActiveTab', z.object({}), async () => {
    return await kernel.browser.getActiveTab();
  });

  registerHandler(
    'omnix:browser:captureSnapshot',
    z.object({ url: z.string().optional() }),
    async (_event, request) => {
      return await kernel.browser.captureSnapshot(request.url);
    }
  );

  registerHandler(
    'omnix:scrape:fetch',
    z.object({
      url: z.string().url(),
      options: z
        .object({
          timeout: z.number().optional(),
          cache: z.boolean().optional(),
        })
        .optional(),
    }),
    async (_event, request) => {
      return await kernel.scrape.fetch(request.url, request.options);
    }
  );

  registerHandler(
    'omnix:scrape:enqueue',
    z.object({ url: z.string().url() }),
    async (_event, request) => {
      return await kernel.scrape.enqueue(request.url);
    }
  );

  registerHandler(
    'omnix:ai:ask',
    z.object({
      question: z.string().min(1),
      context: z
        .object({
          url: z.string().optional(),
          text: z.string().optional(),
        })
        .optional(),
    }),
    async (_event, request) => {
      return await kernel.ai.ask(request.question, request.context);
    }
  );

  registerHandler(
    'omnix:ai:summarize',
    z.object({ url: z.string().url() }),
    async (_event, request) => {
      return await kernel.ai.summarize(request.url);
    }
  );

  registerHandler(
    'omnix:trade:getChart',
    z.object({ symbol: z.string() }),
    async (_event, request) => {
      return await kernel.trade.getChart(request.symbol);
    }
  );

  registerHandler(
    'omnix:file:save',
    z.object({
      path: z.string(),
      content: z.string(),
    }),
    async (_event, request) => {
      return await kernel.file.save(request.path, request.content);
    }
  );

  registerHandler('omnix:file:read', z.object({ path: z.string() }), async (_event, request) => {
    return await kernel.file.read(request.path);
  });

  registerHandler(
    'omnix:security:scanPage',
    z.object({ url: z.string().url() }),
    async (_event, request) => {
      return await kernel.security.scanPage(request.url);
    }
  );
}
