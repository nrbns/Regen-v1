/**
 * Workspace v2 IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';
import { WorkspaceV2SaveRequest, WorkspaceV2LoadRequest, WorkspaceV2UpdateNotesRequest } from '../shared/ipc/schema';
import { getWorkspaceV2Service } from './workspace-v2';

export function registerWorkspaceV2Ipc(): void {
  registerHandler('workspace-v2:save', WorkspaceV2SaveRequest, async (_event, request) => {
    const service = getWorkspaceV2Service();
    await service.save({
      ...request,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  });

  registerHandler('workspace-v2:load', WorkspaceV2LoadRequest, async (_event, request) => {
    const service = getWorkspaceV2Service();
    const workspace = await service.load(request.workspaceId);
    return { workspace };
  });

  registerHandler('workspace-v2:list', z.object({}), async () => {
    const service = getWorkspaceV2Service();
    const workspaces = await service.list();
    return { workspaces };
  });

  registerHandler('workspace-v2:delete', z.object({ workspaceId: z.string() }), async (_event, request) => {
    const service = getWorkspaceV2Service();
    await service.delete(request.workspaceId);
    return { success: true };
  });

  registerHandler('workspace-v2:updateNotes', WorkspaceV2UpdateNotesRequest, async (_event, request) => {
    const service = getWorkspaceV2Service();
    await service.updateNotes(request.workspaceId, request.tabId, request.note);
    return { success: true };
  });

  registerHandler('workspace-v2:getNotes', z.object({ workspaceId: z.string() }), async (_event, request) => {
    const service = getWorkspaceV2Service();
    const notes = await service.getNotes(request.workspaceId);
    return { notes };
  });
}

