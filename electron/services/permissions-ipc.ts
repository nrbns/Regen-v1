/**
 * Permissions IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import {
  requestPermission,
  grantPermission,
  revokePermission,
  listPermissions,
  clearOriginPermissions,
  hasPermission,
} from './permissions';

export function registerPermissionsIpc(): void {
  registerHandler('permissions:request', z.object({
    type: z.enum(['camera', 'microphone', 'filesystem', 'clipboard:write', 'notifications']),
    origin: z.string().url(),
    description: z.string().optional(),
  }), async (_event, request) => {
    return requestPermission(request);
  });

  registerHandler('permissions:grant', z.object({
    type: z.enum(['camera', 'microphone', 'filesystem', 'clipboard:write', 'notifications']),
    origin: z.string().url(),
  }), async (_event, request) => {
    grantPermission(request.type, request.origin);
    return { success: true };
  });

  registerHandler('permissions:revoke', z.object({
    type: z.enum(['camera', 'microphone', 'filesystem', 'clipboard:write', 'notifications']),
    origin: z.string().url(),
  }), async (_event, request) => {
    revokePermission(request.type, request.origin);
    return { success: true };
  });

  registerHandler('permissions:check', z.object({
    type: z.enum(['camera', 'microphone', 'filesystem', 'clipboard:write', 'notifications']),
    origin: z.string().url(),
  }), async (_event, request) => {
    return { granted: hasPermission(request.type, request.origin) };
  });

  registerHandler('permissions:list', z.object({
    type: z.enum(['camera', 'microphone', 'filesystem', 'clipboard:write', 'notifications']).optional(),
    origin: z.string().url().optional(),
  }).optional(), async (_event, request) => {
    return listPermissions(request);
  });

  registerHandler('permissions:clearOrigin', z.object({ origin: z.string().url() }), async (_event, request) => {
    clearOriginPermissions(request.origin);
    return { success: true };
  });
}

