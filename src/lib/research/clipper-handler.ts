/**
 * Research Clipper Handler - Client-side handlers for clipper events
 */

import { ipc } from '../ipc-typed';
import { ipcEvents } from '../ipc-events';
import { useTabsStore } from '../../state/tabsStore';
import { syncDocumentsFromBackend } from './cache';

/**
 * Setup clipper event handlers
 */
export function setupClipperHandlers() {
  // Handle context menu capture
  ipcEvents.on<{ url: string; hasSelection: boolean }>('research:capture-from-context-menu', async (_payload) => {
    try {
      const { activeId } = useTabsStore.getState();
      if (activeId) {
        const result = await ipc.research.capturePage(activeId);
        console.log('[Research Clipper] Page captured:', result.snapshotId);
        
        // Sync to cache
        setTimeout(async () => {
          try {
            await syncDocumentsFromBackend();
          } catch (error) {
            console.error('Failed to sync after capture:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('[Research Clipper] Failed to capture from context menu:', error);
    }
  });

  // Handle selection capture
  ipcEvents.on<{ text: string; url: string }>('research:capture-selection-from-context', async (payload) => {
    try {
      const { activeId } = useTabsStore.getState();
      const result = await ipc.research.captureSelection(payload.text ? payload.text : undefined, activeId ?? undefined);
      console.log('[Research Clipper] Selection captured:', result.clipId);
    } catch (error) {
      console.error('[Research Clipper] Failed to capture selection:', error);
    }
  });

  // Handle keyboard shortcuts
  ipcEvents.on('research:keyboard-capture', async () => {
    try {
      const { activeId } = useTabsStore.getState();
      if (activeId) {
        const result = await ipc.research.capturePage(activeId);
        console.log('[Research Clipper] Page captured via keyboard:', result.snapshotId);
        
        setTimeout(async () => {
          try {
            await syncDocumentsFromBackend();
          } catch (error) {
            console.error('Failed to sync after capture:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('[Research Clipper] Failed to capture via keyboard:', error);
    }
  });

  ipcEvents.on('research:keyboard-open-pane', () => {
    // This would trigger opening the Research Pane
    // The Research Pane component handles its own open state
    console.log('[Research Clipper] Open Research Pane requested');
  });
}

