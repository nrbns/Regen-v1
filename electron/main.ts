// @ts-nocheck

process.env.JSDOM_NO_CANVAS = '1';

import 'dotenv/config';
import 'source-map-support/register.js';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';

// Suppress verbose Chromium logs (media stream, DNS, etc.)
app.commandLine.appendSwitch('log-level', '0'); // 0=INFO (hides VERBOSE)
app.commandLine.appendSwitch('disable-logging'); // Disable file logging

// Single instance lock - MUST be called as early as possible, before any other app methods
// This prevents multiple Electron instances from running simultaneously
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.error('[Main] ❌ Another instance is already running, quitting immediately...');
  console.error('[Main] Please close the existing instance before starting a new one.');
  app.quit();
  process.exit(0);
} else {
  console.log('[Main] ✅ Single instance lock acquired');

  // Handle second instance launch - focus existing window
  // Note: mainWindow will be defined later, so we use BrowserWindow.getAllWindows()
  app.on('second-instance', () => {
    console.log('[Main] ⚠️ Second instance detected, focusing existing window');
    const { BrowserWindow } = require('electron');
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length > 0) {
      const existingWindow = allWindows[0];
      if (existingWindow && !existingWindow.isDestroyed()) {
        if (existingWindow.isMinimized()) {
          existingWindow.restore();
        }
        existingWindow.focus();
        return;
      }
    }
    // If no window exists, it will be created in app.whenReady()
    console.log('[Main] No existing window found, will create new window on ready');
  });
}

import * as path from 'node:path';
import * as fs from 'node:fs';
import { z } from 'zod';
import { registerHandler } from './shared/ipc/router';

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
import { registerTradeIpc } from './services/trade';
import { registerReaderIpc } from './services/reader';
import { registerStorageIpc } from './services/storage';
import { registerSettingsIpc } from './services/settings';
import { registerPluginIpc } from './services/plugins/ipc';
import {
  registerProfileIpc,
  initializeProfiles,
  removeWindow as removeProfileWindow,
  setActiveProfileForWindow,
} from './services/profiles';
import { initializeDiagnostics, registerDiagnosticsIpc } from './services/diagnostics';
import { registerProtocolSchemes, initProtocols } from './services/protocol';
import { registerAgentIpc } from './services/agent/ipc';
import { registerConsentIpc } from './services/consent-ipc';
import { registerPermissionsIpc } from './services/permissions-ipc';
import { registerPrivacyIpc } from './services/privacy-ipc';
import { registerPrivacyStatsIpc } from './services/privacy-stats-ipc';
import { registerDnsIpc } from './services/dns-ipc';
import { registerTorIpc } from './services/tor-ipc';
import { registerVPNIpc } from './services/vpn-ipc';
import { registerNetworkControlsIpc } from './services/network-controls-ipc';
import { initializeNetworkControls } from './services/network-controls';
import { registerOllamaIpc } from './services/agent/ollama-ipc';
import { registerCursorIpc } from './services/cursor/cursor-ipc';
import { registerOmnixIpc } from './services/omnix/omnix-ipc';
import { registerSessionIpc } from './services/session/session-ipc';
import { sessionPersistence } from './services/session/persistence';
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
import { registerRedixIpc } from './services/redix-ipc';
import { registerTabContextIpc } from './services/tab-context-ipc';
import { registerGamesIpc } from './services/games';
import { registerSystemStatusIpc } from './services/system-status';
import {
  sessionSnapshotService,
  SessionSnapshotService,
} from './services/session/snapshot-service';
import { registerSessionRestoreIpc } from './services/session/restore-ipc';
import { initializeCrashReporter, setupCrashHandlers } from './services/crash-dump';
import { registerGPUControlsIpc } from './services/gpu-controls';
import { registerFeatureFlagsIpc } from './services/feature-flags';
import { startMetricsServer } from './services/metrics-server';
import { registerRegenIpc } from './services/regen/ipc';
import { registerTradeIpc } from './services/regen/ipc-trade';
import { registerWorkflowIpc } from './services/workflow-engine';

const fullscreenSchema = z.object({
  fullscreen: z.boolean().optional(),
});

registerHandler('app:toggleFullscreen', fullscreenSchema, async (event, request) => {
  const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
  if (!win || win.isDestroyed()) {
    return { success: false, fullscreen: false };
  }
  const target = typeof request.fullscreen === 'boolean' ? request.fullscreen : !win.isFullScreen();
  try {
    win.setFullScreen(Boolean(target));
    return { success: true, fullscreen: win.isFullScreen() };
  } catch (error) {
    console.error('[Main] Failed to toggle fullscreen:', error);
    return { success: false, fullscreen: win.isFullScreen() };
  }
});

registerHandler(
  'app:setFullscreen',
  z.object({ fullscreen: z.boolean() }),
  async (event, request) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
    if (!win || win.isDestroyed()) {
      return { success: false, fullscreen: false };
    }
    try {
      win.setFullScreen(request.fullscreen);
      return { success: true, fullscreen: win.isFullScreen() };
    } catch (error) {
      console.error('[Main] Failed to set fullscreen:', error);
      return { success: false, fullscreen: win.isFullScreen() };
    }
  }
);

registerHandler('app:getWindowState', z.object({}).optional().default({}), async event => {
  const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow();
  if (!win || win.isDestroyed()) {
    return { fullscreen: false };
  }
  return { fullscreen: win.isFullScreen() };
});

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const isWindows = process.platform === 'win32';
const disableHeavyServices =
  process.env.OB_DISABLE_HEAVY_SERVICES === '1' ||
  (isDev && isWindows && process.env.OB_DISABLE_HEAVY_SERVICES !== '0');
const enableResourceMonitor =
  !disableHeavyServices && process.env.OB_ENABLE_RESOURCE_MONITOR !== '0';
const enablePrivacySentinel =
  !disableHeavyServices && process.env.OB_ENABLE_PRIVACY_SENTINEL !== '0';
const enableVideoCallIpc = !disableHeavyServices && process.env.OB_ENABLE_VIDEO_CALL_IPC !== '0';
// Preload should always be enabled unless explicitly disabled
const disablePreload = process.env.OB_DISABLE_PRELOAD === '1';

console.log(
  '[Main] disableHeavyServices:',
  disableHeavyServices,
  'env:',
  process.env.OB_DISABLE_HEAVY_SERVICES
);

// Constrain the renderer V8 heap to keep memory footprint under ~150MB
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=150');
if (!app.isPackaged) {
  // Only disable sandbox in dev mode for debugging
  // In production, sandbox will be enabled
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

// Single instance lock is already set up above (right after imports)

let mainWindow: BrowserWindow | null = null;
let isCreatingWindow = false; // Prevent duplicate window creation
const agentStore = new AgentStore();

// Reduce GPU attack surface (optional but safe for most apps)
app.disableHardwareAcceleration();

// Security: Ensure remote module is disabled (default in Electron 10+)
// Remote module is not imported or enabled anywhere in the codebase

function createMainWindow(restoreBounds?: {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}) {
  // Prevent duplicate window creation - strict check
  if (isCreatingWindow) {
    console.warn('[Main] Window creation already in progress, skipping');
    return mainWindow;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    console.warn('[Main] Window already exists, focusing existing window');
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    return mainWindow;
  }

  isCreatingWindow = true;
  const preloadPath = disablePreload
    ? undefined
    : isDev
      ? path.join(process.cwd(), 'electron', 'preload.cjs')
      : path.join(__dirname, 'preload.js');

  // Log preload path for debugging
  if (preloadPath) {
    const preloadExists = fs.existsSync(preloadPath);
    console.log(`[Main] Preload path: ${preloadPath}`);
    console.log(`[Main] Preload exists: ${preloadExists}`);
    if (!preloadExists) {
      console.error(`[Main] ERROR: Preload file not found at ${preloadPath}`);
    }
  } else {
    console.warn('[Main] Preload is disabled');
  }

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
      nodeIntegration: false, // Security: Never enable nodeIntegration
      contextIsolation: true, // Security: Isolate context between main and renderer
      sandbox: !isDev, // Security: Enable sandbox in production (disabled in dev for debugging)
      webSecurity: true, // Security: Enable web security
      allowRunningInsecureContent: false, // Security: Block insecure content
      spellcheck: false,
    },
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
    try {
      shell.openExternal(url);
    } catch {}
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
        mainWindow.loadURL(devUrl).catch(e => {
          console.warn('[Dev] loadURL failed, retrying...', e);
          // Retry once after a short delay
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow
                .loadURL(devUrl)
                .catch(err => console.error('[Dev] Failed to load after retry:', err));
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

  // Window created successfully - reset flag after a short delay to prevent race conditions
  setTimeout(() => {
    isCreatingWindow = false;
    console.log('[Main] Window creation completed, flag reset');
  }, 500);

  const windowId = mainWindow.id;
  mainWindow.on('close', async _event => {
    // Save session before closing
    try {
      const { getTabs, getActiveTabId } = await import('./services/tabs');
      const tabs = getTabs(mainWindow);
      const activeId = getActiveTabId(mainWindow);
      const sessionId = 'default';

      const tabRecords = tabs.map((tab, index) => {
        try {
          const wc = tab.view.webContents;
          return {
            id: tab.id,
            url: wc.getURL() || 'about:blank',
            title: wc.getTitle() || 'New Tab',
            active: tab.id === activeId,
            position: index,
            containerId: tab.containerId,
            mode: tab.mode,
            createdAt: tab.createdAt,
            lastActiveAt: tab.lastActiveAt,
            sessionId,
          };
        } catch {
          return {
            id: tab.id,
            url: 'about:blank',
            title: 'New Tab',
            active: tab.id === activeId,
            position: index,
            containerId: tab.containerId,
            mode: tab.mode,
            createdAt: tab.createdAt,
            lastActiveAt: tab.lastActiveAt,
            sessionId,
          };
        }
      });

      await sessionPersistence.saveTabs(mainWindow.id, tabRecords, sessionId);
      console.log('[Main] Session saved before window close');
    } catch (error) {
      console.error('[Main] Failed to save session:', error);
    }
  });

  mainWindow.on('closed', () => {
    removeProfileWindow(windowId);
    mainWindow = null;
    isCreatingWindow = false;
    console.log('[Main] Window closed, reset creation flag');
  });

  // Reset creation flag after a short delay to prevent race conditions
  setTimeout(() => {
    isCreatingWindow = false;
  }, 1000);

  // Assert secure webPreferences at runtime (fail fast if misconfigured)
  try {
    const prefs: any = (mainWindow.webContents as any).getLastWebPreferences?.() ?? {};
    // In production, enforce strict security
    if (app.isPackaged) {
      if (!prefs.contextIsolation || prefs.nodeIntegration || !prefs.sandbox) {
        throw new Error('Insecure webPreferences detected in production');
      }
    } else {
      // In dev, only check critical settings
      if (prefs.nodeIntegration || !prefs.contextIsolation) {
        throw new Error('Critical security settings misconfigured');
      }
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

  // Initialize crash handlers first
  setupCrashHandlers();
  initializeCrashReporter();
  console.log('[Main] Crash handlers initialized');

  applySecurityPolicies();
  console.log('[Main] Security policies applied');

  // Initialize browser optimizations
  try {
    const { getBrowserOptimizer } = await import('./services/optimization/browser-optimizer');
    const optimizer = getBrowserOptimizer();
    optimizer.initializeSession(session.defaultSession);
    console.log('[Main] Browser optimizations initialized');
  } catch (error) {
    console.warn('[Main] Failed to initialize browser optimizations:', error);
  }
  initializeDiagnostics();
  console.log('[Main] Diagnostics initialized');

  // Configure auto-updater (only in production)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();

    // Check for updates every 4 hours
    setInterval(
      () => {
        autoUpdater.checkForUpdatesAndNotify();
      },
      4 * 60 * 60 * 1000
    );

    // Handle update events
    autoUpdater.on('update-available', info => {
      console.log('[AutoUpdater] Update available:', info.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:available', {
          version: info.version,
          releaseDate: info.releaseDate,
        });
      }
    });

    autoUpdater.on('update-downloaded', info => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:downloaded', {
          version: info.version,
        });
      }
    });

    autoUpdater.on('error', error => {
      console.error('[AutoUpdater] Error:', error);
    });
  }

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

  // Register essential IPC handlers FIRST, before window creation, to ensure they're ready
  // This prevents "No handler registered" errors when renderer makes early IPC calls
  console.log('[Main] Registering essential IPC handlers (early)');
  try {
    // Register telemetry IPC early (needed for onboarding)
    const { registerTelemetryIpc } = await import('./services/telemetry');
    registerTelemetryIpc();
    const { registerAnalyticsIpc } = await import('./services/analytics');
    registerAnalyticsIpc();
    console.log('[Main] Telemetry IPC registered (early)');

    // Register shields stub handler if shields service is disabled
    if (disableHeavyServices) {
      const shieldsSchema = z.object({});
      registerHandler('shields:getStatus', shieldsSchema, async () => ({
        adsBlocked: 0,
        trackersBlocked: 0,
        httpsUpgrades: 0,
        cookies3p: 'allow' as const,
        webrtcBlocked: false,
        fingerprinting: false,
      }));
      console.log('[Main] Shields stub handler registered (early)');
    }

    // Register privacy sentinel stub handler if privacy sentinel is disabled
    if (!enablePrivacySentinel) {
      const PrivacyAuditSchema = z.object({
        tabId: z.string().optional().nullable(),
      });
      registerHandler('privacy:sentinel:audit', PrivacyAuditSchema, async () => ({
        score: 100,
        grade: 'high' as const,
        trackers: [],
        thirdPartyHosts: [],
        message: 'Privacy Sentinel is disabled',
        suggestions: [],
        timestamp: Date.now(),
        ai: null,
      }));
      console.log('[Main] Privacy Sentinel stub handler registered (early)');
    }
  } catch (error) {
    console.error('[Main] Failed to register early IPC handlers:', error);
  }

  // Start session persistence (auto-save every 2s)
  const { startSessionPersistence, loadSessionState, restoreWindowTabs, registerSessionStateIpc } =
    await import('./services/session-persistence');
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

    // Register Extension IPC
    const { registerExtensionIpc } = await import('./services/extensions/extension-ipc');
    registerExtensionIpc();
    console.log('[Main] Extension IPC registered');

    // Initialize session persistence
    await sessionPersistence.initialize();
    registerSessionIpc();

    // Register OmniKernel IPC
    registerOmnixIpc(mainWindow);
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
      // Still register performance IPC as it's lightweight and needed for battery updates
      const performance = await import('./services/performance/performance-ipc');
      performance.registerPerformanceIpc();
      console.log('[Main] Performance IPC registered (lightweight)');
    }
    registerStorageIpc();
    registerSettingsIpc();
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
    registerTradeIpc();
    console.log('[Main] Trade IPC registered');
    registerGamesIpc();
    registerSystemStatusIpc();
    registerSessionRestoreIpc();
    registerGPUControlsIpc();
    registerFeatureFlagsIpc();
    registerRegenIpc();
    registerTradeIpc();
    console.log('[Main] System services IPC registered');

    // Start metrics server
    startMetricsServer();
    console.log('[Main] Metrics server started');

    console.log('[Main] Games IPC registered');
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
    registerPrivacyStatsIpc();
    registerDnsIpc();
    registerTorIpc();
    if (!disableHeavyServices) {
      const { registerShieldsIpc } = await import('./services/shields-ipc');
      registerShieldsIpc();
    } else {
      // Stub handler already registered earlier, just log
      console.log('[Main] Shields IPC disabled (stub handler already registered)');
    }
    registerVPNIpc();
    registerNetworkControlsIpc();
    registerOllamaIpc();
    registerCursorIpc();
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
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Dev] Privacy Sentinel disabled to improve stability on this platform');
      }
      // Stub handler already registered earlier, just log
      console.log('[Main] Privacy Sentinel disabled (stub handler already registered)');
    }
    registerTrustWeaverIpc();
    registerRedixIpc();
    registerTabContextIpc();
    registerWorkflowIpc();
    // Telemetry IPC already registered early, just log
    console.log('[Main] Telemetry IPC already registered');

    // Check for session restore before window loads
    const snapshot = SessionSnapshotService.restore();
    if (snapshot && snapshot.tabs.length > 0) {
      // Send restore availability to renderer
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('session:restore-available', {
          tabCount: snapshot.tabs.length,
          mode: snapshot.mode,
          timestamp: snapshot.timestamp,
        });
      });
    }

    // Start snapshotting when window is ready
    mainWindow.webContents.once('did-finish-load', () => {
      sessionSnapshotService.startSnapshotting(mainWindow);
    });

    // Signal renderer that IPC is ready
    mainWindow.webContents.once('did-finish-load', async () => {
      // Small delay to ensure all handlers are fully registered
      setTimeout(() => {
        // Send IPC ready signal
        mainWindow.webContents.send('ipc:ready');
        if (process.env.NODE_ENV === 'development') {
          console.log('[Main] IPC ready signal sent');
        }
      }, 100);

      // Restore tabs from session persistence if available
      try {
        const tabs = await sessionPersistence.loadTabs(mainWindow.id, 'default');
        if (tabs.length > 0 && shouldRestoreTabs) {
          mainWindow.webContents.send('session:restoring', true);
          setTimeout(async () => {
            try {
              const { getTabs } = await import('./services/tabs');
              const existingTabs = getTabs(mainWindow);

              // Only restore if no tabs exist
              if (existingTabs.length === 0) {
                const activeTab = tabs.find(t => t.active);

                // Create tabs via the tab service's internal method
                const tabService = (mainWindow as any).__ob_createTab;
                if (tabService) {
                  for (const tab of tabs) {
                    try {
                      await tabService({
                        id: tab.id,
                        url: tab.url,
                        mode: tab.mode,
                        containerId: tab.containerId,
                        activate: tab.id === activeTab?.id,
                      });
                    } catch (error) {
                      console.warn(`[Main] Failed to restore tab ${tab.id}:`, error);
                    }
                  }
                  console.log(`[Main] Restored ${tabs.length} tabs from session persistence`);
                }
              }
            } catch (error) {
              console.error('[Main] Failed to restore tabs from persistence:', error);
            } finally {
              mainWindow?.webContents.send('session:restoring', false);
            }
          }, 400);
        }
      } catch (error) {
        console.warn('[Main] Failed to load tabs from persistence:', error);
      }

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
    shieldsService.on('counters-updated', status => {
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

// Enhanced crash guardrails with recovery mechanisms
process.on('uncaughtException', err => {
  try {
    console.error('[uncaughtException]', err);
    // Log to crash reporter if available
    if (typeof initializeCrashReporter !== 'undefined') {
      try {
        const { logCrash } = require('./services/crash-dump');
        logCrash('uncaughtException', err);
      } catch {}
    }
    // Don't crash the app - log and continue
    // In production, we might want to show a user-friendly error dialog
  } catch {}
});

process.on('unhandledRejection', (reason, promise) => {
  try {
    console.error('[unhandledRejection]', reason, promise);
    // Log to crash reporter if available
    if (typeof initializeCrashReporter !== 'undefined') {
      try {
        const { logCrash } = require('./services/crash-dump');
        logCrash('unhandledRejection', reason);
      } catch {}
    }
    // For streaming errors, try to recover by cleaning up active streams
    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = String((reason as any).message);
      if (message.includes('stream') || message.includes('IPC')) {
        console.warn('[Main] Stream/IPC error detected, attempting recovery...');
        // Cleanup will be handled by individual stream handlers
      }
    }
  } catch {}
});

// Cleanup on app quit
app.on('before-quit', async () => {
  console.log('[Main] 🛑 Application closing, cleaning up...');

  // Cleanup agent sandbox
  try {
    const { agentSandbox } = await import('./services/agent/sandbox-runner');
    agentSandbox.terminateAll();
    console.log('[Main] Agent sandbox cleaned up');
  } catch (error) {
    console.warn('[Main] Failed to cleanup agent sandbox:', error);
  }

  // Shutdown telemetry gracefully
  await shutdownTelemetry();

  // Kill any child processes (Vite, Redix, Engine, etc.)
  try {
    const isWin = process.platform === 'win32';
    if (isWin) {
      // On Windows, kill processes by port
      const { execSync } = require('child_process');
      try {
        // Kill Vite dev server (port 5173)
        execSync(
          'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :5173\') do taskkill /F /PID %a 2>NUL',
          { stdio: 'ignore' }
        );
      } catch {}
      try {
        // Kill Redix server (port 4000)
        execSync(
          'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :4000\') do taskkill /F /PID %a 2>NUL',
          { stdio: 'ignore' }
        );
      } catch {}
      try {
        // Kill Engine server (port 3030)
        execSync(
          'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3030\') do taskkill /F /PID %a 2>NUL',
          { stdio: 'ignore' }
        );
      } catch {}
    } else {
      // On Unix, kill by port
      const { execSync } = require('child_process');
      try {
        execSync('lsof -ti:5173 | xargs kill -9 2>/dev/null || true', { stdio: 'ignore' });
        execSync('lsof -ti:4000 | xargs kill -9 2>/dev/null || true', { stdio: 'ignore' });
        execSync('lsof -ti:3030 | xargs kill -9 2>/dev/null || true', { stdio: 'ignore' });
      } catch {}
    }
    console.log('[Main] Child processes cleaned up');
  } catch (error) {
    console.warn('[Main] Failed to cleanup child processes:', error);
  }
});

// Minimal IPC placeholders (expand later)
ipcMain.handle('app:ping', () => 'pong');

// Auto-update IPC handlers
if (app.isPackaged) {
  registerHandler('update:check', z.object({}), async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        success: true,
        updateInfo: result?.updateInfo || null,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  registerHandler('update:install', z.object({}), async () => {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });

  registerHandler('update:restart', z.object({}), async () => {
    try {
      autoUpdater.quitAndInstall(true, true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  });
}

// Agent IPC
ipcMain.handle('agent:start', async (e, dsl: unknown) => {
  const runId = randomUUID();
  const parsed = DSL.safeParse(dsl);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const win = BrowserWindow.fromWebContents(e.sender) || mainWindow;
  const emit = (channel: 'agent:token' | 'agent:step', payload: any) =>
    win?.webContents.send(channel, payload);
  runAgent(
    agentStore,
    {
      runId,
      emitToken: t => emit('agent:token', { runId, ...(t as Record<string, unknown>) }),
      emitStep: s => emit('agent:step', { runId, ...(s as Record<string, unknown>) }),
    },
    parsed.data
  );
  return { ok: true, runId };
});

ipcMain.handle('agent:status', (_e, id: string) => agentStore.get(id) ?? null);
ipcMain.handle('agent:stop', async (_e, taskId?: string) => {
  // Terminate specific task or all tasks
  try {
    const { agentSandbox } = await import('./services/agent/sandbox-runner');
    if (taskId) {
      agentSandbox.terminateWorker(taskId);
    } else {
      agentSandbox.terminateAll();
    }
  } catch (error) {
    console.warn('[Main] Failed to stop agent:', error);
  }
  return true;
});
ipcMain.handle('agent:runs', () => agentStore.list());
ipcMain.handle('agent:run:get', (_e, id: string) => agentStore.get(id) ?? null);

// Action IPC
ipcMain.handle('actions:navigate', (_e, url: string) => Actions.navigate(url));
ipcMain.handle('actions:findAndClick', (_e, p: { url: string; args: any }) =>
  Actions.findAndClick(p.url, p.args)
);
ipcMain.handle('actions:typeInto', (_e, p: { url: string; args: any }) =>
  Actions.typeInto(p.url, p.args)
);
ipcMain.handle('actions:waitFor', (_e, p: { url: string; args: any }) =>
  Actions.waitFor(p.url, p.args)
);
ipcMain.handle('actions:scroll', (_e, p: { url: string; args: any }) =>
  Actions.scroll(p.url, p.args)
);
