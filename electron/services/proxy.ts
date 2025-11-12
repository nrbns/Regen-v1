import { session, ipcMain } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { ProxySetRequest, ProxyKillRequest, ProxyStatusResponse } from '../shared/ipc/schema';
import { createLogger } from './utils/logger';
import { getTorService } from './tor';
import { getVPNService } from './vpn';
import { isDoHEnabled, getDoHProvider } from './dns';

const logger = createLogger('proxy');

let killSwitchEnabled = false;
let healthy = true;
let activeProxyProfile: string | undefined = undefined;
export const tabProxies = new Map<string, { host: string; port: number; type: 'socks5' | 'http' }>();
const profileProxies = new Map<string, { host: string; port: number; type: 'socks5' | 'http' }>();

export function registerProxyIpc() {
  // Helper to apply proxy to existing tab
  async function applyProxyToTab(tabId: string, proxyConfig: { type: string; host: string; port: number } | null): Promise<void> {
    try {
      // Import tabs service dynamically to avoid circular dependency
      const tabsModule = await import('./tabs');
      // Get tab by ID (this requires access to internal tab registry)
      // For now, we'll rely on proxy being applied at tab creation
      // Future: Add IPC endpoint to get tab session and apply proxy
      logger.info('Per-tab proxy will be applied on next tab creation/activation', { tabId, proxy: proxyConfig });
    } catch (error) {
      logger.warn('Failed to apply proxy to existing tab', { tabId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Typed IPC handlers
  registerHandler('proxy:set', ProxySetRequest, async (_event, request) => {
    if (request.tabId) {
      // Per-tab proxy (store and apply)
      if (request.type && request.host && request.port) {
        const proxyConfig = { type: request.type, host: request.host, port: request.port };
        tabProxies.set(request.tabId, proxyConfig);
        logger.info('Per-tab proxy set', { tabId: request.tabId, proxy: proxyConfig });
        // Apply proxy to tab's session if tab exists
        await applyProxyToTab(request.tabId, proxyConfig);
      } else {
        tabProxies.delete(request.tabId);
        logger.info('Per-tab proxy cleared', { tabId: request.tabId });
        await applyProxyToTab(request.tabId, null);
      }
      return { success: true };
    }
    
    if (request.profileId) {
      // Profile-level proxy
      if (request.type && request.host && request.port) {
        profileProxies.set(request.profileId, { type: request.type, host: request.host, port: request.port });
        logger.info('Profile proxy set', { profileId: request.profileId, proxy: { type: request.type, host: request.host, port: request.port } });
      } else {
        profileProxies.delete(request.profileId);
        logger.info('Profile proxy cleared', { profileId: request.profileId });
      }
      return { success: true };
    }
    
    // Global proxy
    try {
      if (request.proxyRules || request.mode) {
        // Legacy format
        await session.defaultSession.setProxy({ proxyRules: request.proxyRules, mode: request.mode } as any);
        activeProxyProfile = request.proxyRules ? 'global' : undefined;
        logger.info('Global proxy set (legacy)', { proxyRules: request.proxyRules, mode: request.mode });
      } else if (request.type && request.host && request.port) {
        // New format: convert to proxyRules
        const proxyStr = `${request.type}://${request.host}:${request.port}`;
        await session.defaultSession.setProxy({ proxyRules: proxyStr } as any);
        activeProxyProfile = proxyStr;
        logger.info('Global proxy set', { proxy: proxyStr, type: request.type, host: request.host, port: request.port });
      } else {
        // Clear proxy
        await session.defaultSession.setProxy({ mode: 'direct' } as any);
        activeProxyProfile = undefined;
        logger.info('Global proxy cleared');
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to set proxy', { error: message, request });
      return { success: false, error: message };
    }
  });

  // Get proxy for a tab
  registerHandler('proxy:getForTab', z.object({ tabId: z.string() }), async (_event, request) => {
    // Check tab-specific proxy first
    const tabProxy = tabProxies.get(request.tabId);
    if (tabProxy) {
      return { proxy: tabProxy };
    }
    
    // Check profile proxy (would need tab's profile ID)
    // For now, return null
    return { proxy: null };
  });

  registerHandler('proxy:status', z.object({}), async () => {
    // Get Tor status
    let torStatus = { running: false, bootstrapped: false, circuitEstablished: false };
    try {
      const torService = getTorService();
      const status = torService.getStatus();
      torStatus = {
        running: status.running,
        bootstrapped: status.bootstrapped,
        circuitEstablished: status.circuitEstablished,
      };
    } catch {
      // Tor not initialized
    }

    // Get VPN status
    let vpnStatus = { connected: false, type: undefined as 'wireguard' | 'openvpn' | 'ikev2' | 'other' | undefined };
    try {
      const vpnService = getVPNService();
      const status = vpnService.getStatus();
      vpnStatus = {
        connected: status.connected,
        type: status.type,
      };
    } catch {
      // VPN service not available
    }

    // Get DoH status
    const dohEnabled = isDoHEnabled();
    const dohProvider = dohEnabled ? getDoHProvider() : undefined;

    logger.info('Proxy status requested', {
      healthy,
      killSwitchEnabled,
      activeProxy: activeProxyProfile,
      tor: torStatus,
      vpn: vpnStatus,
      doh: { enabled: dohEnabled, provider: dohProvider },
    });

    return {
      healthy,
      killSwitchEnabled,
      active: activeProxyProfile,
      tor: torStatus,
      vpn: vpnStatus,
      doh: { enabled: dohEnabled, provider: dohProvider },
    } as ProxyStatusResponse;
  });

  registerHandler('proxy:kill', ProxyKillRequest, async (_event, request) => {
    killSwitchEnabled = request.enabled;
    if (request.enabled) {
      logger.info('Proxy kill switch enabled - blocking requests when proxy unhealthy');
      session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
        if (!healthy) {
          logger.warn('Request blocked by kill switch', { url: details.url });
          cb({ cancel: true });
        } else {
          cb({});
        }
      });
    } else {
      logger.info('Proxy kill switch disabled');
      session.defaultSession.webRequest.onBeforeRequest(null as any);
    }
    return { success: true };
  });

  // Legacy handlers for backwards compatibility
  ipcMain.handle('proxy:set', async (_e, rules: { mode?: string; proxyRules?: string } | ProxySetRequest) => {
    if (typeof rules === 'object' && ('proxyRules' in rules || 'mode' in rules)) {
      // Legacy format
      await session.defaultSession.setProxy(rules as any);
    } else {
      // New format - already handled by typed handler
      ProxySetRequest.parse(rules);
      // Reuse typed handler logic
    }
    return true;
  });

  ipcMain.handle('proxy:status', () => ({ healthy, killSwitchEnabled }));

  ipcMain.handle('proxy:kill', (_e, enabled: boolean) => {
    const request = ProxyKillRequest.parse({ enabled });
    killSwitchEnabled = request.enabled;
    if (request.enabled) {
      session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
        if (!healthy) cb({ cancel: true }); else cb({});
      });
    } else {
      session.defaultSession.webRequest.onBeforeRequest(null as any);
    }
  });
}


