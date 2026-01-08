// Backend Entry Point - Initialize all systems

import { systemState } from './state/SystemState';
import { TabManager } from './browser/TabManager';
import { NavigationController } from './browser/NavigationController';
import { DownloadManager } from './browser/DownloadManager';
import { AIController } from './ai/AIController';
import { IntentRouter } from './ai/IntentRouter';
import { IPCHandler, IPC_EVENTS } from './ipc/events';

// Initialize AI on startup
AIController.initialize().catch(error => {
  console.error('Failed to initialize AI:', error);
});

// Set up IPC event handlers
function setupIPCHandlers() {
  // Navigation events
  IPCHandler.on(IPC_EVENTS.NAVIGATE, (payload: { tabId: string; url: string }) => {
    NavigationController.navigate(payload.tabId, payload.url);
  });

  IPCHandler.on(IPC_EVENTS.BACK, (payload: { tabId: string }) => {
    NavigationController.back(payload.tabId);
  });

  IPCHandler.on(IPC_EVENTS.FORWARD, (payload: { tabId: string }) => {
    NavigationController.forward(payload.tabId);
  });

  IPCHandler.on(IPC_EVENTS.RELOAD, (payload: { tabId: string }) => {
    NavigationController.reload(payload.tabId);
  });

  // Tab events
  IPCHandler.on(IPC_EVENTS.NEW_TAB, (payload: { url?: string }) => {
    TabManager.createTab(payload.url);
  });

  IPCHandler.on(IPC_EVENTS.CLOSE_TAB, (payload: { tabId: string }) => {
    TabManager.closeTab(payload.tabId);
  });

  IPCHandler.on(IPC_EVENTS.SWITCH_TAB, (payload: { tabId: string }) => {
    TabManager.switchTab(payload.tabId);
  });

  // AI events
  IPCHandler.on(IPC_EVENTS.RUN_AI, async (payload: { task: string; context?: any }) => {
    try {
      const result = await AIController.runTask(payload.task);
      // Emit result back to UI
      IPCHandler.send('ai:result', { result, task: payload.task });
    } catch (error) {
      IPCHandler.send('ai:error', { error: error.message, task: payload.task });
    }
  });

  // Download events
  IPCHandler.on(IPC_EVENTS.DOWNLOAD, (payload: { filename: string; url: string }) => {
    DownloadManager.handleDownload(payload.filename, payload.url);
  });
}

// Initialize IPC handlers
setupIPCHandlers();

// Export everything for use in main.tsx
export {
  systemState,
  TabManager,
  NavigationController,
  DownloadManager,
  AIController,
  IntentRouter,
  IPCHandler,
  IPC_EVENTS,
};
