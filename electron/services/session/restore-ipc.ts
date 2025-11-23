/**
 * Session Restore IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { SessionSnapshotService } from './snapshot-service';

export function registerSessionRestoreIpc() {
  // Check if restore is available
  registerHandler('session:checkRestore', z.object({}), async () => {
    try {
      const snapshot = SessionSnapshotService.restore();
      if (!snapshot || !snapshot.tabs || !Array.isArray(snapshot.tabs)) {
        return { available: false };
      }

      return {
        available: true,
        snapshot: {
          tabCount: snapshot.tabs.length || 0,
          mode: snapshot.mode || 'Browse',
          timestamp: snapshot.timestamp || Date.now(),
          activeTabId: snapshot.activeTabId || null,
        },
      };
    } catch (error) {
      console.error('[SessionRestore] Error checking restore:', error);
      return { available: false };
    }
  });

  // Get full snapshot for restore
  registerHandler('session:getSnapshot', z.object({}), async () => {
    try {
      const snapshot = SessionSnapshotService.restore();
      if (!snapshot || !snapshot.tabs || !Array.isArray(snapshot.tabs)) {
        return null;
      }
      return snapshot;
    } catch (error) {
      console.error('[SessionRestore] Error getting snapshot:', error);
      return null;
    }
  });

  // Dismiss restore (clear snapshot)
  registerHandler('session:dismissRestore', z.object({}), async () => {
    const { sessionSnapshotService } = await import('./snapshot-service');
    sessionSnapshotService.clear();
    return { success: true };
  });
}
