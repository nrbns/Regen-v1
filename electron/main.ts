// @ts-nocheck

process.env.JSDOM_NO_CANVAS = '1';

import 'dotenv/config';
import 'source-map-support/register';
import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import * as path from 'node:path';
import { applySecurityPolicies } from './security';
import { randomUUID } from 'node:crypto';
import { AgentStore } from './services/agent/store';
import { runAgent, DSL } from './services/agent/brain';
import { registerRecorderIpc } from './automate/recorder';
import { registerTabIpc } from './services/tabs';
import { registerContainersIpc } from './services/containers';
import { registerProxyIpc } from './services/proxy';
import { registerDownloadsIpc } from './services/downloads-enhanced';
import { registerWatchersIpc } from './services/watchers';
import { registerScrapingIpc } from './services/scraping';
import { registerVideoIpc } from './services/video';
import { registerThreatsIpc } from './services/threats';
import { registerGraphIpc } from './services/graph';
import { registerLedgerIpc } from './services/ledger';
import { registerHistoryIpc } from './services/history';
import { registerResearchIpc } from './services/research';
import { registerReaderIpc } from './services/reader';
import { registerStorageIpc } from './services/storage';
import { registerPluginIpc } from './services/plugins/ipc';
import { registerProfileIpc, initializeProfiles, removeWindow as removeProfileWindow, setActiveProfileForWindow } from './services/profiles';
import { initializeDiagnostics, registerDiagnosticsIpc } from './services/diagnostics';
import { registerProtocolSchemes, initProtocols } from './services/protocol';
import { registerAgentIpc } from './services/agent/ipc';
import { registerConsentIpc } from './services/consent-ipc';
import { registerPermissionsIpc } from './services/permissions-ipc';
import { registerPrivacyIpc } from './services/privacy-ipc';
import { registerDnsIpc } from './services/dns-ipc';
import { registerTorIpc } from './services/tor-ipc';
import { registerShieldsIpc } from './services/shields-ipc';
import { registerVPNIpc } from './services/vpn-ipc';
import { registerNetworkControlsIpc } from './services/network-controls-ipc';
import { initializeNetworkControls } from './services/network-controls';
import { registerOllamaIpc } from './services/agent/ollama-ipc';
import { registerCitationGraphIpc } from './services/knowledge/citation-ipc';
import { registerKnowledgeIpc } from './services/knowledge/knowledge-ipc';
import { registerCognitiveIpc } from './services/cognitive/cognitive-ipc';
import { registerWorkspaceV2Ipc } from './services/workspace-v2-ipc';
import { registerSessionBundleIpc, setAgentStore } from './services/session-bundle-ipc';
import { registerHistoryGraphIpc } from './services/history-graph-ipc';
import { registerOmniScriptIpc } from './services/omniscript-ipc';
import { registerOmniBrainIpc } from './services/omni-brain-ipc';
import { registerSpiritualIpc } from './services/spiritual/spiritual-ipc';
import { registerPluginMarketplaceIpc } from './services/plugins/marketplace-ipc';
import { registerEnhancedThreatIpc } from './services/threats/enhanced-ipc';
import { registerPerformanceIpc } from './services/performance/performance-ipc';
import { startResourceMonitor } from './services/performance/resource-monitor';
import { registerWorkerIpc } from './services/workers/worker-ipc';
import { registerVideoCallIpc } from './services/video-call-ipc';
import { registerSessionsIpc } from './services/sessions-ipc';
import { registerPrivateIpc } from './services/private-ipc';
import { initializeTelemetry, shutdownTelemetry } from './services/observability/telemetry';
import { getShieldsService } from './services/shields';
import * as Actions from './services/actions';
import { registerCloudVectorIpc } from './services/knowledge/cloud-vector-ipc';
import { registerHybridSearchIpc } from './services/search/hybrid-search-ipc';
import { registerE2EESyncIpc } from './services/sync/e2ee-sync-ipc';
import { registerStreamingIpc } from './services/agent/streaming-ipc';

let mainWindow: BrowserWindow | null = null;
let isCreatingWindow = false; // Prevent duplicate window creation
const agentStore = new AgentStore();

const isDev = !!process.env.VITE_DEV_SERVER_URL;

// Reduce GPU attack surface (optional but safe for most apps)
app.disableHardwareAcceleration();

function createMainWindow(restoreBounds?: { x: number; y: number; width: number; height: number; isMaximized: boolean }) {
  // Prevent duplicate window creation
  if (isCreatingWindow || mainWindow && !mainWindow.isDestroyed()) {
    console.warn('Window already exists or is being created, skipping');
    return mainWindow;
  }
  
  isCreatingWindow = true;
  mainWindow = new BrowserWindow({
    width: restoreBounds?.width || 1280,
    height: restoreBounds?.height || 800,
    x: restoreBounds?.x,
    y: restoreBounds?.y,
    title: 'OmniBrowser',
    backgroundColor: '#1A1D28',
    webPreferences: {
      // Use built preload in prod; use local CJS preload in dev (ts-node)
      preload: isDev
        ? path.join(process.cwd(), 'electron', 'preload.cjs')
        : path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    }
  });

  const createdAt = Date.now();
  (mainWindow as any).__ob_createdAt = createdAt;
  (mainWindow as any).__ob_lastFocusedAt = createdAt;
  mainWindow.on('focus', () => {
    (mainWindow as any).__ob_lastFocusedAt = Date.now();
  });
  mainWindow.on('blur', () => {
    (mainWindow as any).__ob_lastFocusedAt = Date.now();
  });

  setActiveProfileForWindow(mainWindow, 'default');

  // In packaged builds, don't allow DevTools to stay open
  if (app.isPackaged) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  // External links open in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Legacy safety net for popups
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    try { shell.openExternal(url); } catch {}
  });

  // Prevent in-app navigations to external pages; open them externally instead
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const current = mainWindow?.webContents.getURL();
      if (url && url !== current) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {}
  });

  if (isDev) {
    // Development: load from Vite dev server
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    // Wait a bit for Vite to be ready, then load
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(devUrl).catch((e) => {
          console.warn('[Dev] loadURL failed, retrying...', e);
          // Retry once after a short delay
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.loadURL(devUrl).catch((err) => 
                console.error('[Dev] Failed to load after retry:', err)
              );
            }
          }, 2000);
        });
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }, 500);
  } else {
    // Production: load from built files
    const htmlPath = path.resolve(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(htmlPath);
  }

  // Restore window state
  if (restoreBounds?.isMaximized) {
    mainWindow.maximize();
  }

  // Increase max listeners to prevent warnings (some IPC handlers add multiple listeners)
  mainWindow.setMaxListeners(100);
  
  isCreatingWindow = false; // Window created successfully

  const windowId = mainWindow.id;
  mainWindow.on('closed', () => {
    removeProfileWindow(windowId);
    mainWindow = null;
    isCreatingWindow = false;
  });

  // Assert secure webPreferences at runtime (fail fast if misconfigured)
  try {
    const prefs: any = (mainWindow.webContents as any).getLastWebPreferences?.() ?? {};
    if (!prefs.contextIsolation || prefs.nodeIntegration || !prefs.sandbox) {
      throw new Error('Insecure webPreferences detected');
    }
  } catch {}
}

// Register protocol schemes BEFORE app.ready()
registerProtocolSchemes();

// Initialize protocol handlers (after app.ready)
initProtocols();

// Initialize network controls BEFORE app.ready() for command-line flags
const networkControls = initializeNetworkControls();
networkControls.initializeDefaults();

app.whenReady().then(async () => {
  applySecurityPolicies();
  initializeDiagnostics();

  initializeProfiles();

  // Initialize observability (OpenTelemetry)
  initializeTelemetry({
    enabled: process.env.OTEL_ENABLED === 'true',
    serviceName: 'omnibrowser',
    serviceVersion: app.getVersion(),
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    consoleExporter: process.env.NODE_ENV === 'development',
  });
  
  // Apply IPv6 protection now that session is available
  if (networkControls.getConfig().ipv6LeakProtection) {
    networkControls.disableIPv6();
  }
  
  // Start session persistence (auto-save every 2s)
  const { startSessionPersistence, loadSessionState, restoreWindowTabs, registerSessionStateIpc } = await import('./services/session-persistence');
  startSessionPersistence();
  
  // Try to restore previous session
  const snapshot = await loadSessionState();
  let shouldRestoreTabs = false;
  
  if (snapshot && snapshot.windows.length > 0) {
    // Restore windows from snapshot
    const firstWindow = snapshot.windows[0];
    createMainWindow(firstWindow.bounds);
    shouldRestoreTabs = firstWindow.tabs && firstWindow.tabs.length > 0;
  } else {
    createMainWindow();
  }
  
  // Set agent store for session bundles
  setAgentStore(agentStore);
  
  if (mainWindow) {
    // Set main window reference early
    const { setMainWindow } = await import('./services/windows');
    setMainWindow(mainWindow);
    
    // Register ALL IPC handlers BEFORE window loads to ensure readiness
    registerRecorderIpc(mainWindow);
    registerTabIpc(mainWindow);
    registerContainersIpc();
    registerProxyIpc();
    registerDownloadsIpc();
    registerWatchersIpc();
    registerScrapingIpc();
    registerVideoIpc(mainWindow);
    registerThreatsIpc();
    registerStorageIpc();
    registerSessionStateIpc();
    registerDiagnosticsIpc();
    registerGraphIpc();
    registerLedgerIpc();
    registerHistoryIpc();
    registerResearchIpc();
    registerReaderIpc();
    const { registerResearchEnhancedIpc } = await import('./services/research-enhanced');
    registerResearchEnhancedIpc();
    const { registerDocumentReviewIpc } = await import('./services/document-review');
    registerDocumentReviewIpc();
    registerPluginIpc();
    registerProfileIpc();
    registerAgentIpc();
    registerConsentIpc();
    registerPermissionsIpc();
    registerPrivacyIpc();
    registerDnsIpc();
    registerTorIpc();
    registerShieldsIpc();
    registerVPNIpc();
    registerNetworkControlsIpc();
    registerOllamaIpc();
    registerCitationGraphIpc();
    registerKnowledgeIpc();
    registerCognitiveIpc();
    registerWorkspaceV2Ipc();
    registerSessionBundleIpc();
    registerHistoryGraphIpc();
    registerOmniScriptIpc();
    registerOmniBrainIpc();
    registerSpiritualIpc();
    registerPluginMarketplaceIpc();
    registerEnhancedThreatIpc();
    registerPerformanceIpc();
    startResourceMonitor();
    registerWorkerIpc();
    registerVideoCallIpc();
    registerSessionsIpc();
    registerPrivateIpc();
    registerCloudVectorIpc();
    registerHybridSearchIpc();
    registerE2EESyncIpc();
    registerStreamingIpc();
    
    // Signal renderer that IPC is ready
    mainWindow.webContents.once('did-finish-load', () => {
      // Small delay to ensure all handlers are fully registered
      setTimeout(() => {
        // Send IPC ready signal
        mainWindow.webContents.send('ipc:ready');
        if (process.env.NODE_ENV === 'development') {
          console.log('[Main] IPC ready signal sent');
        }
      }, 100);
      
      if (shouldRestoreTabs && snapshot && snapshot.windows.length > 0) {
        const firstWindow = snapshot.windows[0];
        mainWindow.webContents.send('session:restoring', true);
        
        setTimeout(async () => {
          try {
            await restoreWindowTabs(mainWindow, firstWindow);
          } catch (error) {
            console.error('Failed to restore tabs from session:', error);
          } finally {
            shouldRestoreTabs = false;
            mainWindow?.webContents.send('session:restoring', false);
          }
        }, 400);
      }
    });
    registerPrivateIpc();
    
    // New architecture enhancements
    registerCloudVectorIpc();
    registerHybridSearchIpc();
    registerE2EESyncIpc();
    registerStreamingIpc();

    // Forward shields counter updates to renderer
    const shieldsService = getShieldsService();
    shieldsService.on('counters-updated', (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Send counters to all tabs - each tab component will filter by activeId
        // For now, send with empty tabId, frontend will match by active tab
        mainWindow.webContents.send('shields:counters', {
          tabId: '', // Will be matched by frontend
          ads: status.adsBlocked || 0,
          trackers: status.trackersBlocked || 0,
          cookiesBlocked: 0, // Would need to track this separately
          httpsUpgrades: status.httpsUpgrades || 0,
        });
      }
    });
  }
});

app.on('activate', () => {
  // On macOS, re-create window if all are closed
  if (process.platform === 'darwin') {
    if (BrowserWindow.getAllWindows().length === 0 && !isCreatingWindow) {
      createMainWindow();
    } else {
      // Focus existing window
      const existingWindow = BrowserWindow.getAllWindows()[0];
      if (existingWindow && !existingWindow.isDestroyed()) {
        if (existingWindow.isMinimized()) existingWindow.restore();
        existingWindow.focus();
      }
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Crash guardrails for production visibility
process.on('uncaughtException', (err) => {
  try { console.error('[uncaughtException]', err); } catch {}
});
process.on('unhandledRejection', (reason) => {
  try { console.error('[unhandledRejection]', reason); } catch {}
});

app.on('before-quit', async () => {
  // Shutdown telemetry gracefully
  await shutdownTelemetry();
});

// Minimal IPC placeholders (expand later)
ipcMain.handle('app:ping', () => 'pong');

// Agent IPC
ipcMain.handle('agent:start', async (e, dsl: unknown) => {
  const runId = randomUUID();
  const parsed = DSL.safeParse(dsl);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const win = BrowserWindow.fromWebContents(e.sender) || mainWindow;
  const emit = (channel: 'agent:token'|'agent:step', payload: any) => win?.webContents.send(channel, payload);
  runAgent(agentStore, {
    runId,
    emitToken: (t) => emit('agent:token', { runId, ...(t as Record<string, unknown>) }),
    emitStep: (s) => emit('agent:step', { runId, ...(s as Record<string, unknown>) }),
  }, parsed.data);
  return { ok: true, runId };
});

ipcMain.handle('agent:status', (_e, id: string) => agentStore.get(id) ?? null);
ipcMain.handle('agent:stop', () => true);
ipcMain.handle('agent:runs', () => agentStore.list());
ipcMain.handle('agent:run:get', (_e, id: string) => agentStore.get(id) ?? null);

// Action IPC
ipcMain.handle('actions:navigate', (_e, url: string) => Actions.navigate(url));
ipcMain.handle('actions:findAndClick', (_e, p: { url: string; args: any }) => Actions.findAndClick(p.url, p.args));
ipcMain.handle('actions:typeInto', (_e, p: { url: string; args: any }) => Actions.typeInto(p.url, p.args));
ipcMain.handle('actions:waitFor', (_e, p: { url: string; args: any }) => Actions.waitFor(p.url, p.args));
ipcMain.handle('actions:scroll', (_e, p: { url: string; args: any }) => Actions.scroll(p.url, p.args));


