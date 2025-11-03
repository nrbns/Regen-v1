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
import { registerProxyIpc } from './services/proxy';
import { registerDownloadsIpc } from './services/downloads-enhanced';
import { registerScrapingIpc } from './services/scraping';
import { registerVideoIpc } from './services/video';
import { registerThreatsIpc } from './services/threats';
import { registerGraphIpc } from './services/graph';
import { registerLedgerIpc } from './services/ledger';
import { registerHistoryIpc } from './services/history';
import { registerResearchIpc } from './services/research';
import { registerStorageIpc } from './services/storage';
import { registerPluginIpc } from './services/plugins/ipc';
import { registerProfileIpc } from './services/profiles';
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
const agentStore = new AgentStore();

const isDev = !!process.env.VITE_DEV_SERVER_URL;

// Reduce GPU attack surface (optional but safe for most apps)
app.disableHardwareAcceleration();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'OmniBrowser',
    backgroundColor: '#1A1D28',
    webPreferences: {
      // vite-plugin-electron outputs preload to dist-electron/preload.js (same dir as main.js)
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    }
  });

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
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
    // Optional: open DevTools in development
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: load from built files
    const htmlPath = path.resolve(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(htmlPath);
  }

  // Maximize window on startup (full screen)
  mainWindow.maximize();

  mainWindow.on('closed', () => {
    mainWindow = null;
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
  
  createMainWindow();
  
  // Set agent store for session bundles
  setAgentStore(agentStore);
  
  if (mainWindow) {
    // Set main window reference early
    const { setMainWindow } = require('./services/windows');
    setMainWindow(mainWindow);
    
    registerRecorderIpc(mainWindow);
    registerTabIpc(mainWindow);
    registerProxyIpc();
    registerDownloadsIpc();
    registerScrapingIpc();
    registerVideoIpc(mainWindow);
    registerThreatsIpc();
    registerStorageIpc();
    registerGraphIpc();
    registerLedgerIpc();
    registerHistoryIpc();
    registerResearchIpc();
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
    registerWorkerIpc();
    registerVideoCallIpc();
    registerSessionsIpc();
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
    if (mainWindow) mainWindow.maximize();
  } else {
    // If window exists but is minimized, restore and maximize
    const existingWindow = BrowserWindow.getAllWindows()[0];
    if (existingWindow) {
      existingWindow.maximize();
      existingWindow.focus();
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


