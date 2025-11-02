/**
 * Session Bundle IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';
import { SessionBundleExportRequest, SessionBundleImportRequest, SessionBundleReplayRequest } from '../shared/ipc/schema';
import { getSessionBundleService } from './session-bundle';
// Note: agentStore import would need to be passed or accessed differently
// For now, using a workaround
let globalAgentStore: any = null;

export function setAgentStore(store: any) {
  globalAgentStore = store;
}

export function registerSessionBundleIpc(): void {
  registerHandler('session-bundle:export', SessionBundleExportRequest, async (_event, request) => {
    const service = getSessionBundleService();
    if (!globalAgentStore) {
      throw new Error('Agent store not initialized');
    }
    const filePath = await service.exportBundle(request.runId, globalAgentStore, {
      name: request.name,
      description: request.description,
    });
    return { filePath };
  });

  registerHandler('session-bundle:import', SessionBundleImportRequest, async (_event, request) => {
    const service = getSessionBundleService();
    const bundle = await service.importBundle(request.filePath);
    return { bundle };
  });

  registerHandler('session-bundle:replay', SessionBundleReplayRequest, async (_event, request) => {
    const service = getSessionBundleService();
    // Load bundle first
    const bundles = await service.listBundles();
    const bundleFile = bundles.find(b => b.id === request.bundleId);
    if (!bundleFile) {
      throw new Error('Bundle not found');
    }
    const bundle = await service.importBundle(bundleFile.path);
    const result = await service.replayBundle(bundle, {
      restoreWorkspace: request.restoreWorkspace,
      replayAgent: request.replayAgent,
    });
    return result;
  });

  registerHandler('session-bundle:list', z.object({}), async () => {
    const service = getSessionBundleService();
    const bundles = await service.listBundles();
    return { bundles };
  });
}

