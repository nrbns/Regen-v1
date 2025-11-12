// @ts-nocheck

process.env.JSDOM_NO_CANVAS = '1';

import 'dotenv/config';
import 'source-map-support/register.js';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';

import { applySecurityPolicies } from './security';
import { randomUUID } from 'node:crypto';
import { AgentStore } from './services/agent/store';
import { runAgent, DSL } from './services/agent/brain';
import { registerRecorderIpc } from './automate/recorder';
import { registerTabIpc } from './services/tabs';
import { registerContainersIpc } from './services/containers';
import { registerProxyIpc } from './services/proxy';
import { registerDownloadsIpc } from './services/downloads-enhanced';
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
import { registerVPNIpc } from './services/vpn-ipc';
import { registerNetworkControlsIpc } from './services/network-controls-ipc';
import { initializeNetworkControls } from './services/network-controls';
import { registerOllamaIpc } from './services/agent/ollama-ipc';
import { registerCitationGraphIpc } from './services/knowledge/citation-ipc';
import { registerKnowledgeIpc } from './services/knowledge/knowledge-ipc';
import { registerCrossRealityBridge } from './services/cross-reality-bridge';
import { registerCognitiveIpc } from './services/cognitive/cognitive-ipc';
import { registerWorkspaceV2Ipc } from './services/workspace-v2-ipc';
import { registerSessionBundleIpc, setAgentStore } from './services/session-bundle-ipc';
import { registerHistoryGraphIpc } from './services/history-graph-ipc';
import { registerOmniScriptIpc } from './services/omniscript-ipc';
import { registerOmniBrainIpc } from './services/omni-brain-ipc';
import { registerSpiritualIpc } from './services/spiritual/spiritual-ipc';
import { registerPluginMarketplaceIpc } from './services/plugins/marketplace-ipc';
import { registerExtensionNexusIpc } from './services/plugins/nexus-ipc';
import { registerEnhancedThreatIpc } from './services/threats/enhanced-ipc';
import { registerEcoImpactIpc } from './services/performance/eco-impact-ipc';
import { registerIdentityIpc } from './services/identity-ipc';
import { registerGraphIpc } from './services/graph';
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
import { registerPrivacySentinelIpc } from './services/security/privacy-sentinel';
import { registerTrustWeaverIpc } from './services/trust-weaver-ipc';

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const isWindows = process.platform === 'win32';
const disableHeavyServices =
  process.env.OB_DISABLE_HEAVY_SERVICES === '1' ||
  (isDev && isWindows && process.env.OB_DISABLE_HEAVY_SERVICES !== '0');
const enableResourceMonitor = !disableHeavyServices && process.env.OB_ENABLE_RESOURCE_MONITOR !== '0';
const enablePrivacySentinel = !disableHeavyServices && process.env.OB_ENABLE_PRIVACY_SENTINEL !== '0';
const enableVideoCallIpc = !disableHeavyServices && process.env.OB_ENABLE_VIDEO_CALL_IPC !== '0';
const disablePreload =
  process.env.OB_DISABLE_PRELOAD === '1' ||
  (isDev && isWindows && process.env.OB_DISABLE_PRELOAD !== '0');

console.log('[Main] disableHeavyServices:', disableHeavyServices, 'env:', process.env.OB_DISABLE_HEAVY_SERVICES);

// Constrain the renderer V8 heap to keep memory footprint under ~150MB
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=150');
if (!app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-features', 'SimpleCacheBackend');
  const devUserData = path.join(app.getPath('temp'), `omnibrowser-dev-${randomUUID()}`);
  const devCacheDir = path.join(devUserData, 'Cache');
  try {
    fs.mkdirSync(devUserData, { recursive: true });
    fs.mkdirSync(devCacheDir, { recursive: true });
    app.setPath('userData', devUserData);
    console.log('[Main] Dev userData path:', devUserData);
  } catch (error) {
    console.warn('[Main] Failed to override userData path for dev session', error);
  }
  app.commandLine.appendSwitch('disable-http-cache');
  app.commandLine.appendSwitch('disk-cache-dir', devCacheDir);
  app.commandLine.appendSwitch('disk-cache-size', '0');

  app.once('will-quit', () => {
    try {
      fs.rmSync(devUserData, { recursive: true, force: true });
    } catch {}
  });
}

if (isWindows && isDev) {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  app.commandLine.appendSwitch('use-gl', 'swiftshader');
  app.commandLine.appendSwitch('disable-webgl');
}

let mainWindow: BrowserWindow | null = null;
let isCreatingWindow = false; // Prevent duplicate window creation
const agentStore = new AgentStore();

// Reduce GPU attack surface (optional but safe for most apps)
app.disableHardwareAcceleration();

function createMainWindow(restoreBounds?: { x: number; y: number; width: number; height: number; isMaximized: boolean }) {
  // Prevent duplicate window creation
  if (isCreatingWindow || mainWindow && !mainWindow.isDestroyed()) {
    console.warn('Window already exists or is being created, skipping');
    return mainWindow;
  }
  
  isCreatingWindow = true;
  const preloadPath = disablePreload
    ? undefined
    : (isDev
        ? path.join(process.cwd(), 'electron', 'preload.cjs')
        : path.join(__dirname, 'preload.js'));

  mainWindow = new BrowserWindow({
    width: restoreBounds?.width || 1280,
    height: restoreBounds?.height || 800,
    x: restoreBounds?.x,
    y: restoreBounds?.y,
    title: 'OmniBrowser',
    backgroundColor: '#1A1D28',
    webPreferences: {
      // Use built preload in prod; use local CJS preload in dev (ts-node)
      preload: preloadPath,
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
        if (process.env.OB_OPEN_DEVTOOLS === '1') {
          try {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
          } catch (error) {
            console.warn('[Dev] Failed to open devtools:', error);
          }
        }
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
console.log('[Main] Network controls initialized');
networkControls.initializeDefaults();
console.log('[Main] Network defaults applied');

app.whenReady().then(async () => {
  console.log('[Main] app.whenReady resolved');
  applySecurityPolicies();
  console.log('[Main] Security policies applied');
  initializeDiagnostics();
  console.log('[Main] Diagnostics initialized');

  initializeProfiles();
  console.log('[Main] Profiles initialized');

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
  console.log('[Main] Session persistence module loaded');
  startSessionPersistence();
  console.log('[Main] Session persistence started');
  
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
    console.log('[Main] Recorder IPC registered');
    registerTabIpc(mainWindow);
    console.log('[Main] Tab IPC registered');
    registerContainersIpc();
    console.log('[Main] Containers IPC registered');
    registerProxyIpc();
    console.log('[Main] Proxy IPC registered');
    registerDownloadsIpc();
    console.log('[Main] Downloads IPC registered');
    if (!disableHeavyServices) {
      const [watchers, scraping, video, threats, enhancedThreat, performance] = await Promise.all([
        import('./services/watchers'),
        import('./services/scraping'),
        import('./services/video'),
        import('./services/threats'),
        import('./services/threats/enhanced-ipc'),
        import('./services/performance/performance-ipc'),
      ]);
      watchers.registerWatchersIpc();
      scraping.registerScrapingIpc();
      video.registerVideoIpc(mainWindow);
      threats.registerThreatsIpc();
      enhancedThreat.registerEnhancedThreatIpc();
      performance.registerPerformanceIpc();
    } else {
      console.log('[Main] Heavy IPC services disabled');
    }
    registerStorageIpc();
    console.log('[Main] Storage IPC registered');
    registerSessionStateIpc();
    console.log('[Main] Session state IPC registered');
    registerDiagnosticsIpc();
    console.log('[Main] Diagnostics IPC registered');
    registerGraphIpc();
    console.log('[Main] Graph IPC registered');
    registerLedgerIpc();
    console.log('[Main] Ledger IPC registered');
    registerHistoryIpc();
    console.log('[Main] History IPC registered');
    registerResearchIpc();
    console.log('[Main] Research IPC registered');
    registerReaderIpc();
    console.log('[Main] Reader IPC registered');
    const { registerResearchEnhancedIpc } = await import('./services/research-enhanced');
    registerResearchEnhancedIpc();
    const { registerLiveSearchIpc } = await import('./services/search/live-search');
    registerLiveSearchIpc();
    const { registerGraphAnalyticsIpc } = await import('./services/graph-analytics');
    registerGraphAnalyticsIpc();
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
    if (!disableHeavyServices) {
      const { registerShieldsIpc } = await import('./services/shields-ipc');
      registerShieldsIpc();
    } else {
      console.log('[Main] Shields IPC disabled');
    }
    registerVPNIpc();
    registerNetworkControlsIpc();
    registerOllamaIpc();
    registerCitationGraphIpc();
    registerKnowledgeIpc();
    registerCrossRealityBridge();
    registerCognitiveIpc();
    registerWorkspaceV2Ipc();
    registerSessionBundleIpc();
    registerHistoryGraphIpc();
    registerOmniScriptIpc();
    registerOmniBrainIpc();
    registerSpiritualIpc();
    registerPluginMarketplaceIpc();
    registerExtensionNexusIpc();
    registerEnhancedThreatIpc();
    registerEcoImpactIpc();
    registerIdentityIpc();
    if (enableResourceMonitor) {
      startResourceMonitor();
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[Dev] Resource monitor disabled to improve stability on this platform');
    }
    registerWorkerIpc();
    if (enableVideoCallIpc) {
      registerVideoCallIpc();
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[Dev] Video call IPC disabled to improve stability on this platform');
    }
    registerSessionsIpc();
    registerPrivateIpc();
    registerCloudVectorIpc();
    registerHybridSearchIpc();
    registerE2EESyncIpc();
    registerStreamingIpc();
    if (enablePrivacySentinel) {
      registerPrivacySentinelIpc();
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[Dev] Privacy Sentinel disabled to improve stability on this platform');
    }
    registerTrustWeaverIpc();
    
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


