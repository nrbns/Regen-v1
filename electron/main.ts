import 'dotenv/config';
import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'node:path';
import { applySecurityPolicies } from './security';
import { randomUUID } from 'node:crypto';
import { AgentStore } from './services/agent/store';
import { runAgent, DSL } from './services/agent/brain';
import { registerRecorderIpc } from './automate/recorder';
import { registerTabIpc } from './services/tabs';
import { registerProxyIpc } from './services/proxy';
import { registerDownloadsIpc } from './services/downloads';
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
import * as Actions from './services/actions';

let mainWindow: BrowserWindow | null = null;
const agentStore = new AgentStore();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'OmniBrowser',
    backgroundColor: '#1A1D28',
    webPreferences: {
      preload: path.join(process.cwd(), 'electron', 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    }
  });

  const rendererUrl = app.isPackaged
    ? `file://${path.join(process.cwd(), 'dist', 'renderer', 'index.html')}`
    : 'http://localhost:5173';
  mainWindow.loadURL(rendererUrl);

  // Maximize window on startup (full screen)
  mainWindow.maximize();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
  
  // Apply IPv6 protection now that session is available
  if (networkControls.getConfig().ipv6LeakProtection) {
    networkControls.disableIPv6();
  }
  
  createMainWindow();
  
  // Set agent store for session bundles
  setAgentStore(agentStore);
  
  if (mainWindow) {
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
  }

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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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


