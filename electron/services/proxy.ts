import { session, ipcMain } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { ProxySetRequest, ProxyKillRequest, ProxyStatusResponse } from '../shared/ipc/schema';

let killSwitchEnabled = false;
let healthy = true;
let activeProxyProfile: string | undefined = undefined;
export const tabProxies = new Map<string, { host: string; port: number; type: 'socks5' | 'http' }>();
const profileProxies = new Map<string, { host: string; port: number; type: 'socks5' | 'http' }>();

export function registerProxyIpc() {
  // Typed IPC handlers
  registerHandler('proxy:set', ProxySetRequest, async (_event, request) => {
    if (request.tabId) {
      // Per-tab proxy (store and apply)
      if (request.type && request.host && request.port) {
        const proxyConfig = { type: request.type, host: request.host, port: request.port };
        tabProxies.set(request.tabId, proxyConfig);
        // Apply proxy to tab's session if tab exists
        // This will be handled when tab is created/activated
      } else {
        tabProxies.delete(request.tabId);
      }
      return { success: true };
    }
    
    if (request.profileId) {
      // Profile-level proxy
      if (request.type && request.host && request.port) {
        profileProxies.set(request.profileId, { type: request.type, host: request.host, port: request.port });
      } else {
        profileProxies.delete(request.profileId);
      }
      return { success: true };
    }
    
    // Global proxy
    if (request.proxyRules || request.mode) {
      // Legacy format
      await session.defaultSession.setProxy({ proxyRules: request.proxyRules, mode: request.mode } as any);
      activeProxyProfile = request.proxyRules ? 'global' : undefined;
    } else if (request.type && request.host && request.port) {
      // New format: convert to proxyRules
      const proxyStr = `${request.type}://${request.host}:${request.port}`;
      await session.defaultSession.setProxy({ proxyRules: proxyStr } as any);
      activeProxyProfile = proxyStr;
    }
    return { success: true };
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
    return {
      healthy,
      killSwitchEnabled,
      active: activeProxyProfile,
    } as ProxyStatusResponse;
  });

  registerHandler('proxy:kill', ProxyKillRequest, async (_event, request) => {
    killSwitchEnabled = request.enabled;
    if (request.enabled) {
      session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
        if (!healthy) cb({ cancel: true }); else cb({});
      });
    } else {
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
      const request = ProxySetRequest.parse(rules);
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


