/**
 * Session Restore IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { SessionSnapshotService } from './snapshot-service';

export function registerSessionRestoreIpc() {
  // Check if restore is available
  registerHandler('session:checkRestore', z.object({}), async () => {
    const snapshot = SessionSnapshotService.restore();
    if (!snapshot) {
      return { available: false };
    }

    return {
      available: true,
      snapshot: {
        tabCount: snapshot.tabs.length,
        mode: snapshot.mode,
        timestamp: snapshot.timestamp,
        activeTabId: snapshot.activeTabId,
      },
    };
  });

  // Get full snapshot for restore
  registerHandler('session:getSnapshot', z.object({}), async () => {
    const snapshot = SessionSnapshotService.restore();
    return snapshot;
  });

  // Dismiss restore (clear snapshot)
  registerHandler('session:dismissRestore', z.object({}), async () => {
    const { sessionSnapshotService } = await import('./snapshot-service');
    sessionSnapshotService.clear();
    return { success: true };
  });
}
