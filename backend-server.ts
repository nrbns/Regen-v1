#!/usr/bin/env tsx
/**
 * Regen Backend Server
 *
 * Real-time backend service that owns browser state and AI execution.
 * Runs as separate Node.js process, communicates via IPC with frontend.
 */

import { systemState } from './src/backend';
import { TabManager } from './src/backend/browser/TabManager';
import { NavigationController } from './src/backend/browser/NavigationController';
import { DownloadManager } from './src/backend/browser/DownloadManager';
import { AIController } from './src/backend/ai/AIController';
import { IntentRouter } from './src/backend/ai/IntentRouter';
import { IPC_EVENTS } from './src/backend/ipc/events';

// IPC handlers for communication with frontend
const ipcHandlers = {
  // Tab management
  [IPC_EVENTS.NEW_TAB]: async (payload: { url?: string }) => {
    const tabId = TabManager.createTab(payload.url);
    return { tabId };
  },

  [IPC_EVENTS.CLOSE_TAB]: async (payload: { tabId: string }) => {
    TabManager.closeTab(payload.tabId);
    return { success: true };
  },

  [IPC_EVENTS.SWITCH_TAB]: async (payload: { tabId: string }) => {
    TabManager.switchTab(payload.tabId);
    return { success: true };
  },

  // Navigation
  [IPC_EVENTS.NAVIGATE]: async (payload: { tabId: string; url: string }) => {
    NavigationController.navigate(payload.tabId, payload.url);
    return { success: true };
  },

  [IPC_EVENTS.BACK]: async (payload: { tabId: string }) => {
    NavigationController.back(payload.tabId);
    return { success: true };
  },

  [IPC_EVENTS.FORWARD]: async (payload: { tabId: string }) => {
    NavigationController.forward(payload.tabId);
    return { success: true };
  },

  [IPC_EVENTS.RELOAD]: async (payload: { tabId: string }) => {
    NavigationController.reload(payload.tabId);
    return { success: true };
  },

  // AI
  [IPC_EVENTS.RUN_AI]: async (payload: { task: string; context?: any }) => {
    try {
      const result = await AIController.runTask(payload.task);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Downloads
  [IPC_EVENTS.DOWNLOAD]: async (payload: { filename: string; url: string }) => {
    try {
      const downloadId = DownloadManager.handleDownload(payload.filename, payload.url);
      return { success: true, downloadId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // System state
  [IPC_EVENTS.GET_STATE]: async () => {
    return systemState.getState();
  },
};

// Set up IPC event listeners (this would integrate with Tauri's IPC in production)
function setupIPC() {
  // In a real implementation, this would connect to Tauri's IPC
  // For now, we'll set up a basic event system
  console.log('🔧 Backend IPC initialized');

  // Listen for IPC events (would come from Tauri frontend)
  Object.entries(ipcHandlers).forEach(([event, handler]) => {
    // In Tauri, this would be: invoke(event, handler)
    console.log(`📡 Registered IPC handler: ${event}`);
  });
}

// Initialize the backend service
async function startBackend() {
  console.log('🚀 Starting Regen Backend Service...');

  try {
    // Initialize AI service
    await AIController.initialize();
    console.log('🤖 AI service initialized');

    // Set up IPC handlers
    setupIPC();

    // Start listening for system state changes
    systemState.on('state-changed', (newState, oldState) => {
      // In Tauri, this would emit events to frontend
      console.log('📊 System state changed:', {
        tabs: newState.tabs.length,
        status: newState.status,
        aiRunning: newState.ai.running,
      });
    });

    console.log('✅ Regen Backend Service ready');
    console.log('🌐 IPC endpoints available for frontend communication');

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('🛑 Shutting down Regen Backend Service...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down Regen Backend Service...');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start Regen Backend Service:', error);
    process.exit(1);
  }
}

// Start the backend service
startBackend();