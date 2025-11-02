/**
 * Privacy Dashboard IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getAllOriginData, purgeOriginData, exportUserData } from './privacy';

export function registerPrivacyIpc(): void {
  registerHandler('privacy:getOrigins', z.object({}), async () => {
    return await getAllOriginData();
  });

  registerHandler('privacy:purgeOrigin', z.object({ origin: z.string().url() }), async (_event, request) => {
    await purgeOriginData(request.origin);
    return { success: true };
  });

  registerHandler('privacy:export', z.object({}), async () => {
    return await exportUserData();
  });
}

