// @ts-nocheck

import { BrowserView, BrowserWindow, ipcMain, session, screen } from 'electron';
import { randomUUID, createHash } from 'node:crypto';
import { addToGraph } from '../services/graph';
import { pushHistory } from './history';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { registerTab, wakeTab, unregisterTab, hibernateTab, isTabSleeping } from './tab-sleep';
import { registerTabMemory, unregisterTabMemory } from './memory';
import { burnTab } from './burn';
import { getShieldsService } from './shields';
import { tabProxies } from './proxy';
import { getVideoCallOptimizer } from './video-call-optimizer';
import { getSessionManager } from './sessions';
import { getContainerManager, ContainerPermission } from './containers';
import {
  TabCreateRequest,
  TabCreateResponse,
  TabCreateWithProfileRequest,
  TabCloseRequest,
  TabActivateRequest,
  TabNavigateRequest,
  TabGoBackRequest,
  TabGoForwardRequest,
  TabReloadRequest,
  TabListResponse,
  TabSetContainerRequest,
  TabWakeRequest,
} from '../shared/ipc/schema';

type TabMode = 'normal' | 'ghost' | 'private';

type TabRecord = {
  id: string;
  view: BrowserView;
  partition: string;
  sessionId?: string; // Track which session this tab belongs to
  mode: TabMode;
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  containerIcon?: string;
  createdAt: number;
  lastActiveAt: number;
  profileId?: string;
};

const windowIdToTabs = new Map<number, TabRecord[]>();
let activeTabIdByWindow = new Map<number, string | null>();
let rightDockPxByWindow = new Map<number, number>();
const resizeTimers = new WeakMap<BrowserWindow, NodeJS.Timeout>();
const pendingBoundsUpdateTimers = new Map<string, NodeJS.Timeout>();
const cleanupRegistered = new WeakMap<BrowserWindow, boolean>(); // Track cleanup registration
const predictiveCache = new Map<
  string,
  {
    groups: Array<{ id: string; label: string; tabIds: string[]; confidence: number }>;
    prefetch: Array<{ tabId: string; url: string; reason: string; confidence: number }>;
    summary?: { generatedAt: string; explanation?: string };
  }
>();

const findTabByWebContents = (wc: Electron.WebContents): TabRecord | undefined => {
  for (const tabs of windowIdToTabs.values()) {
    const found = tabs.find(tab => tab.view.webContents === wc);
    if (found) return found;
  }
  return undefined;
};

let notifySessionDirtyFn: (() => void) | null = null;

const markSessionDirty = () => {
  if (notifySessionDirtyFn) {
    notifySessionDirtyFn();
    return;
  }

  import('./session-persistence')
    .then((mod) => {
      notifySessionDirtyFn = mod.notifySessionDirty;
      notifySessionDirtyFn?.();
    })
    .catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Tabs] Failed to notify session persistence:', error);
      }
    });
};

export type SerializedTab = {
  id: string;
  title: string;
  url: string;
  active: boolean;
  mode: TabMode;
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  createdAt: number;
  lastActiveAt: number;
  sessionId?: string;
  profileId?: string;
  sleeping: boolean;
};

export function getActiveTabId(win: BrowserWindow): string | null {
  return activeTabIdByWindow.get(win.id) ?? null;
}

export function serializeTabsForWindow(win: BrowserWindow): SerializedTab[] {
  const tabs = windowIdToTabs.get(win.id) ?? [];
  const activeId = getActiveTabId(win);
  const survivors: TabRecord[] = [];
  const serialized: SerializedTab[] = [];

  for (const tab of tabs) {
    const view = tab.view;
    if (!view || view.webContents.isDestroyed()) {
      try {
        view?.webContents?.removeAllListeners?.();
      } catch {}
      continue;
    }

    survivors.push(tab);

    let title = 'New Tab';
    let url = 'about:blank';
    try {
      title = view.webContents.getTitle() || title;
      url = view.webContents.getURL() || url;
    } catch {
      // Ignore errors from destroyed webContents
    }

    serialized.push({
      id: tab.id,
      title,
      url,
      active: tab.id === activeId,
      mode: tab.mode,
      containerId: tab.containerId,
      containerName: tab.containerName,
      containerColor: tab.containerColor,
      createdAt: tab.createdAt,
      lastActiveAt: tab.lastActiveAt,
      sessionId: tab.sessionId,
      profileId: tab.profileId,
      sleeping: isTabSleeping(tab.id),
    });
  }

  if (survivors.length !== tabs.length) {
    windowIdToTabs.set(win.id, survivors);
  }

  return serialized;
}

interface CreateTabOptions {
  url?: string;
  profileId?: string;
  sessionId?: string;
  partitionOverride?: string;
  mode?: TabMode;
  activate?: boolean;
  fromSessionRestore?: boolean;
  containerId?: string;
  id?: string;
  createdAt?: number;
  lastActiveAt?: number;
}

// Track warned tab IDs with timestamp to prevent spam (only warn once per tab ID per minute)
const warnedTabIds = new Map<string, number>();
const WARN_CLEAR_INTERVAL = 60000; // 1 minute

// Clear old warnings periodically
setInterval(() => {
  const now = Date.now();
  for (const [tabId, timestamp] of warnedTabIds.entries()) {
    if (now - timestamp > WARN_CLEAR_INTERVAL) {
      warnedTabIds.delete(tabId);
    }
  }
}, WARN_CLEAR_INTERVAL);

const clearPendingBoundsTimerForTab = (winId: number, tabId: string) => {
  const timerKey = `${winId}:${tabId}`;
  const timer = pendingBoundsUpdateTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    pendingBoundsUpdateTimers.delete(timerKey);
  }
};

export function getTabs(win: BrowserWindow) {
  if (!windowIdToTabs.has(win.id)) windowIdToTabs.set(win.id, []);
  return windowIdToTabs.get(win.id)!;
}

// Track which windows have had IPC registered to prevent duplicate registration
const registeredWindows = new WeakSet<BrowserWindow>();

export function registerTabIpc(win: BrowserWindow) {
  // Prevent duplicate registration
  if (registeredWindows.has(win)) {
    console.warn('Tab IPC already registered for this window, skipping');
    return;
  }
  registeredWindows.add(win);
  const containerManager = getContainerManager();
  const activeContainer = containerManager.getActiveForWindow(win);
  (win as any).__ob_defaultContainerId = activeContainer.id;
  win.once('closed', () => {
    containerManager.removeWindow(win.id);
  });
  
  // Increase max listeners for this window to prevent warnings
  // Multiple IPC handlers and event listeners can add up quickly
  win.setMaxListeners(100);
  
  setupBrowserViewResize(win);
  const pruneDestroyedTabs = () => {
    const tabs = getTabs(win);
    const filtered = tabs.filter(tab => {
      const view = tab.view;
      if (!view || view.webContents.isDestroyed()) {
        try {
          view?.webContents?.removeAllListeners?.();
        } catch {}
        return false;
      }
      return true;
    });
    if (filtered.length !== tabs.length) {
      windowIdToTabs.set(win.id, filtered);
    }
    return filtered;
  };

  const emit = () => {
    const tabs = pruneDestroyedTabs();
    const active = activeTabIdByWindow.get(win.id);
    const tabList = tabs.map(t => {
      let title = 'New Tab';
      let url = 'about:blank';
      try {
        const wc = t.view?.webContents;
        if (wc && !wc.isDestroyed()) {
          title = wc.getTitle() || title;
          url = wc.getURL() || url;
        }
      } catch (error) {
        console.warn('Failed to read tab metadata', error);
      }
      return {
        id: t.id,
        title,
        url,
        active: t.id === active,
        mode: t.mode,
        containerId: t.containerId,
        containerName: t.containerName,
        containerColor: t.containerColor,
        createdAt: t.createdAt,
        lastActiveAt: t.lastActiveAt,
        sessionId: t.sessionId,
        profileId: t.profileId,
      sleeping: isTabSleeping(t.id),
      };
    });
    // Send to both legacy and typed IPC listeners
    win.webContents.send('tabs:updated', tabList);
    // Also send via typed IPC channel
    if (win.webContents && !win.webContents.isDestroyed()) {
      try {
        win.webContents.send('ob://ipc/v1/tabs:updated', tabList);
      } catch {}
    }

    markSessionDirty();
  };

  const createTabInternal = async (options: CreateTabOptions = {}) => {
    const id = options.id ?? randomUUID();
    const defaultMode: TabMode = (win as any).__ob_tabModeDefault ?? 'normal';
    const mode: TabMode = options.mode ?? defaultMode;
    const targetUrl = options.url || 'about:blank';
    let partition = options.partitionOverride;
    let sessionId: string | undefined = mode === 'normal' ? options.sessionId : undefined;
    let sess: Electron.Session;
    let partitionOptions: Electron.FromPartitionOptions | undefined = mode === 'normal' ? undefined : { cache: false };
    let containerIdResolved: string | undefined = options.containerId;
    const sessionManager = getSessionManager();
    const activeSession = sessionManager.getActiveSession();
    const defaultContainerId: string = (win as any).__ob_defaultContainerId ?? 'default';
    const activeProfileId: string = (win as any).__ob_activeProfileId ?? 'default';
    const resolvedProfileId = options.profileId ?? (activeProfileId !== 'default' ? activeProfileId : undefined);

    if (mode === 'ghost') {
      containerIdResolved = 'stealth';
    } else if (mode === 'private') {
      containerIdResolved = (win as any).__ob_defaultContainerId || 'default';
    }

    let containerMeta = containerManager.getContainer(containerIdResolved || defaultContainerId);
    containerIdResolved = containerMeta.id;
    let deriveSitePartition = mode === 'normal';

    if (!partition) {
      if (mode === 'ghost') {
        partition = `temp:ghost:${randomUUID()}`;
        partitionOptions = { cache: false };
        sessionId = undefined;
        deriveSitePartition = false;
      } else if (mode === 'private') {
        partition = (win as any).__ob_defaultPartitionOverride || `temp:private:${randomUUID()}`;
        partitionOptions = { cache: false };
        sessionId = undefined;
        deriveSitePartition = false;
      } else {
        let sessionPartition: string | undefined;
        if (resolvedProfileId) {
          sessionPartition = `persist:profile:${resolvedProfileId}`;
        } else if (sessionId) {
          sessionPartition = sessionManager.getSessionPartition(sessionId);
        } else if (activeSession) {
          sessionPartition = sessionManager.getSessionPartition(activeSession.id);
          sessionId = activeSession.id;
        } else {
          sessionPartition = sessionManager.getSessionPartition('default');
          sessionId = 'default';
        }

        const resolution = containerManager.resolvePartition({
          containerId: containerIdResolved || defaultContainerId,
          sessionPartition,
          sessionId,
          tabId: id,
        });

        containerMeta = resolution.container;
        containerIdResolved = containerMeta.id;
        partitionOptions = resolution.partitionOptions;
        deriveSitePartition = resolution.deriveSitePartition;
        const basePartition = resolution.basePartition;

        if (deriveSitePartition) {
          try {
            const urlObj = new URL(targetUrl);
            const origin = urlObj.origin;
            const originHash = createHash('sha256').update(origin).digest('hex').slice(0, 16);
            partition = `${basePartition}:site:${originHash}`;
          } catch {
            partition = basePartition;
          }
        } else {
          partition = basePartition;
        }
      }
    }

    if (!partition) {
      partition = `temp:default:${randomUUID()}`;
    }

    sess = session.fromPartition(partition, partitionOptions);
    if (mode !== 'normal') {
      sessionId = undefined;
    }

    const view = new BrowserView({
      webPreferences: {
        session: sess,
        contextIsolation: true,
        sandbox: false,
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        plugins: true,
        autoplayPolicy: 'no-user-gesture-required',
      },
    });

    // Fullscreen handlers
    view.webContents.on('enter-html-full-screen', () => {
      try {
        win.setFullScreen(true);
        win.webContents.send('app:fullscreen-changed', { fullscreen: true });
        setTimeout(() => {
          const display = screen.getPrimaryDisplay();
          const { width, height } = display.workAreaSize;
          view.setBounds({ x: 0, y: 0, width, height });
        }, 100);
      } catch (e) {
        console.error('Failed to enter fullscreen:', e);
      }
    });
    view.webContents.on('leave-html-full-screen', () => {
      try {
        win.setFullScreen(false);
        win.webContents.send('app:fullscreen-changed', { fullscreen: false });
        setTimeout(() => updateBrowserViewBounds(win, id), 100);
      } catch (e) {
        console.error('Failed to leave fullscreen:', e);
      }
    });

    // Permission handlers
    sess.setPermissionRequestHandler((wc, permission, callback) => {
      const record = findTabByWebContents(wc);
      const containerId = record?.containerId ?? containerIdResolved ?? 'default';
      const allowed = containerManager.isPermissionAllowed(containerId, permission);
      if (!allowed) {
        callback(false);
        return;
      }
      let origin: string | undefined;
      try {
        origin = new URL(wc.getURL()).origin;
      } catch {
        origin = undefined;
      }
      if (origin) {
        containerManager.recordSitePermission(containerId, permission as ContainerPermission, origin);
      }
      callback(true);
    });
    sess.setPermissionCheckHandler((wc, permission) => {
      const record = findTabByWebContents(wc);
      const containerId = record?.containerId ?? containerIdResolved ?? 'default';
      if (!containerManager.isPermissionAllowed(containerId, permission)) {
        return false;
      }
      try {
        const origin = new URL(wc.getURL()).origin;
        if (origin) {
          return containerManager.hasSitePermission(containerId, permission as ContainerPermission, origin);
        }
      } catch {
        return false;
      }
      return false;
    });

    const shouldRecordHistory = mode === 'normal';

    const sendNavigationState = () => {
      try {
        if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
          win.webContents.send('tabs:navigation-state', {
            tabId: id,
            canGoBack: view.webContents.canGoBack(),
            canGoForward: view.webContents.canGoForward(),
          });
        }
      } catch {}
    };

    view.webContents.loadURL(targetUrl).catch(() => {});
    view.webContents.on('page-title-updated', () => emit());
    view.webContents.on('did-navigate', async (_e2, navUrl) => {
      emit();
      sendNavigationState();

      try {
        const urlObj = new URL(navUrl);
        const isVideoSite = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv'].some(domain =>
          urlObj.hostname.includes(domain)
        );

        if (!isVideoSite) {
          const shieldsService = getShieldsService();
          shieldsService.injectFingerprintProtection(view.webContents);
          shieldsService.blockWebRTC(view.webContents);
        }
      } catch {}

      if (shouldRecordHistory) {
        try {
          const title = view.webContents.getTitle();
          const hostname = new URL(navUrl).hostname;
          pushHistory(navUrl, title || navUrl);
          win.webContents.send('history:updated');
          const text: string = await view.webContents
            .executeJavaScript('document.body.innerText.slice(0,5000)', true)
            .catch(() => '');
          const entities = Array.from(new Set((text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).slice(0, 10)));
          addToGraph({ key: navUrl, title, type: 'page' }, [{ src: hostname, dst: navUrl, rel: 'contains', weight: 1 }]);
          addToGraph({ key: hostname, title: hostname, type: 'site' });
          for (const ent of entities) {
            addToGraph({ key: `ent:${ent}`, title: ent, type: 'entity' }, [{ src: navUrl, dst: `ent:${ent}`, rel: 'mentions', weight: 1 }]);
          }
        } catch {}
      }
    });

    view.webContents.on('dom-ready', () => {
      try {
        const currentUrl = view.webContents.getURL();
        if (!currentUrl) return;

        const urlObj = new URL(currentUrl);
        const isVideoSite = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv'].some(domain =>
          urlObj.hostname.includes(domain)
        );

        if (!isVideoSite) {
          const shieldsService = getShieldsService();
          shieldsService.injectFingerprintProtection(view.webContents);
          shieldsService.blockWebRTC(view.webContents);
        }
      } catch {}
    });

    view.webContents.on('did-navigate-in-page', () => {
      sendNavigationState();
    });

    if (mode === 'ghost') {
      const cleanup = () => {
        try {
          sess.clearStorageData();
          sess.clearCache();
          sess.clearHostResolverCache();
        } catch {}
      };
      view.webContents.on('destroyed', cleanup);
    }

    const tabs = getTabs(win);
    tabs.push({
      id,
      view,
      partition: partition!,
      sessionId: sessionId || undefined,
      mode,
      containerId: containerMeta.id,
      containerName: containerMeta.name,
      containerColor: containerMeta.color,
      containerIcon: containerMeta.icon,
      createdAt: options.createdAt ?? Date.now(),
      lastActiveAt: options.lastActiveAt ?? Date.now(),
      profileId: resolvedProfileId ?? activeProfileId,
    });

    if (options.activate !== false) {
      setActiveTab(win, id);
    }

    if (mode === 'normal' && sessionId) {
      const sessionTabs = tabs.filter(t => t.sessionId === sessionId);
      sessionManager.updateTabCount(sessionId, sessionTabs.length, id);
    }

    emit();
    setTimeout(sendNavigationState, 150);

    const optimizer = getVideoCallOptimizer();
    view.webContents.once('did-finish-load', () => {
      const url = view.webContents.getURL();
      if (url) {
        optimizer.setupForWebContents(view.webContents, url);
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[Tabs] Tab created successfully:', id, 'mode:', mode);
    }
    return { id };
  };

  (win as any).__ob_createTab = createTabInternal;
  (win as any).__ob_closeAllTabs = () => {
    const tabs = [...getTabs(win)];
    for (const tab of tabs) {
      void closeTabInternal(tab.id);
    }
  };

  // Typed IPC handlers
  registerHandler('tabs:list', z.object({}), async () => {
    const tabs = getTabs(win);
    const active = activeTabIdByWindow.get(win.id);
    return tabs.map(t => {
      try {
        const url = t.view.webContents.getURL();
        return { 
          id: t.id, 
          title: t.view.webContents.getTitle() || 'New Tab', 
          active: t.id === active,
          url: url || 'about:blank',
          mode: t.mode,
          containerId: t.containerId,
          containerName: t.containerName,
          containerColor: t.containerColor,
          createdAt: t.createdAt,
          lastActiveAt: t.lastActiveAt,
          sessionId: t.sessionId,
          profileId: t.profileId,
        };
      } catch (e) {
        // If webContents is destroyed, return basic info
        return {
          id: t.id,
          title: 'New Tab',
          active: t.id === active,
          url: 'about:blank',
          mode: t.mode,
          containerId: t.containerId,
          containerName: t.containerName,
          containerColor: t.containerColor,
          createdAt: t.createdAt,
          lastActiveAt: t.lastActiveAt,
          sessionId: t.sessionId,
          profileId: t.profileId,
        };
      }
    }) as z.infer<typeof TabListResponse>;
  });

  registerHandler('tabs:create', TabCreateRequest, async (_event, request) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Tabs] Creating tab with request:', request);
    }
    const defaultMode: TabMode = (win as any).__ob_tabModeDefault ?? 'normal';
    return createTabInternal({
      url: request.url,
      profileId: request.profileId,
      mode: request.mode ?? defaultMode,
      containerId: request.containerId,
      id: request.tabId,
      activate: request.activate,
      createdAt: request.createdAt,
      lastActiveAt: request.lastActiveAt,
      sessionId: request.sessionId,
      fromSessionRestore: request.fromSessionRestore,
    }) as Promise<z.infer<typeof TabCreateResponse>>;
  });

  registerHandler('tabs:createWithProfile', TabCreateWithProfileRequest, async (_event, request) => {
    const defaultMode: TabMode = (win as any).__ob_tabModeDefault ?? 'normal';
    return createTabInternal({
      url: request.url,
      partitionOverride: `persist:acct:${request.accountId}`,
      mode: defaultMode,
      activate: true,
    }) as Promise<z.infer<typeof TabCreateResponse>>;
  });

  registerHandler('tabs:setContainer', TabSetContainerRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const index = tabs.findIndex(t => t.id === request.id);
    if (index === -1) {
      return { success: false, error: 'Tab not found' };
    }

    const record = tabs[index];
    if (!record || record.mode !== 'normal') {
      return { success: false, error: 'Only normal tabs can switch containers' };
    }

    if (record.containerId === request.containerId) {
      return { success: true, unchanged: true };
    }

    const wasActive = activeTabIdByWindow.get(win.id) === record.id;
    let currentUrl = 'about:blank';
    try {
      currentUrl = record.view.webContents.getURL() || 'about:blank';
    } catch {}

    const createdAt = record.createdAt;
    const sessionId = record.sessionId;
    const profileId = record.profileId;

    try {
      win.removeBrowserView(record.view);
    } catch {}
    try {
      record.view.webContents.removeAllListeners();
      record.view.webContents.destroy?.();
    } catch {}
    try {
      record.view.destroy?.();
    } catch {}

    clearPendingBoundsTimerForTab(win.id, record.id);
    unregisterTab(record.id);
    unregisterTabMemory(record.id);

    tabs.splice(index, 1);

    await createTabInternal({
      id: record.id,
      url: currentUrl,
      sessionId,
      profileId,
      containerId: request.containerId,
      activate: false,
      createdAt,
      lastActiveAt: Date.now(),
    });

    const updatedTabs = getTabs(win);
    const newIndex = updatedTabs.findIndex(t => t.id === record.id);
    if (newIndex > -1 && newIndex !== index) {
      const [newRecord] = updatedTabs.splice(newIndex, 1);
      updatedTabs.splice(index, 0, newRecord);
    }

    if (wasActive) {
      setActiveTab(win, record.id);
    } else {
      emit();
    }

    return { success: true };
  });

  const closeTabInternal = async (tabId: string) => {
    const tabs = getTabs(win);
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx < 0) {
      return { success: false, error: 'Tab not found' };
    }

    const [rec] = tabs.splice(idx, 1);
    const wasActive = activeTabIdByWindow.get(win.id) === tabId;
    clearPendingBoundsTimerForTab(win.id, tabId);

    try {
      unregisterTab(tabId);
      unregisterTabMemory(tabId);
    } catch (e) {
      console.warn('Error unregistering tab:', e);
    }

    if (rec.sessionId) {
      try {
        const sessionManager = getSessionManager();
        const sessionTabs = tabs.filter(t => t.sessionId === rec.sessionId);
        sessionManager.updateTabCount(rec.sessionId, sessionTabs.length);
      } catch (e) {
        console.warn('Error updating session tab count:', e);
      }
    }

    try {
      win.removeBrowserView(rec.view);
      rec.view.webContents.close();
    } catch (e) {
      console.error('Error closing tab BrowserView:', e);
    }

    if (wasActive) {
      if (tabs.length > 0) {
        const nextTab = tabs[Math.min(idx, tabs.length - 1)];
        if (nextTab) {
          setActiveTab(win, nextTab.id);
        } else {
          activeTabIdByWindow.set(win.id, null);
        }
      } else {
        activeTabIdByWindow.set(win.id, null);
      }
    }

    emit();
    return { success: true };
  };

  registerHandler('tabs:close', TabCloseRequest, async (_event, request) => {
    return closeTabInternal(request.id);
  });

  registerHandler(
    'tabs:predictiveGroups',
    z.object({
      windowId: z.number().optional(),
      force: z.boolean().optional(),
    }),
    async (_event, request) => {
      const windowId = request.windowId ?? win.id;
      const tabs = windowIdToTabs.get(windowId) ?? [];
      const cacheKey = `${windowId}:${tabs.map((t) => t.id).join(',')}:${tabs
        .map((t) => t.lastActiveAt)
        .join(',')}`;

      if (!request.force && predictiveCache.has(cacheKey)) {
        return predictiveCache.get(cacheKey);
      }

      const payload = {
        windowId,
        timestamp: Date.now(),
        tabs: tabs.map((tab) => ({
          id: tab.id,
          title: (() => {
            try {
              return tab.view?.webContents.getTitle?.() || 'New Tab';
            } catch {
              return 'New Tab';
            }
          })(),
          url: (() => {
            try {
              return tab.view?.webContents.getURL?.() || 'about:blank';
            } catch {
              return 'about:blank';
            }
          })(),
          containerId: tab.containerId,
          containerName: tab.containerName,
          containerColor: tab.containerColor,
          mode: tab.mode,
          createdAt: tab.createdAt,
          lastActiveAt: tab.lastActiveAt,
          sessionId: tab.sessionId,
          profileId: tab.profileId,
        })),
        activeTabId: activeTabIdByWindow.get(windowId) ?? null,
      };

      const baseUrl =
        process.env.PREDICTIVE_API_BASE ||
        process.env.TAB_PREDICTOR_API ||
        process.env.REDIX_API_BASE ||
        process.env.API_BASE_URL;

      try {
        let result:
          | {
              groups?: Array<{ id: string; label: string; tabIds: string[]; confidence?: number }>;
              prefetch?: Array<{ tabId: string; url: string; reason?: string; confidence?: number }>;
              summary?: { generatedAt?: string; explanation?: string };
            }
          | null = null;

        if (baseUrl) {
          const response = await fetch(`${baseUrl.replace(/\/$/, '')}/tabs/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            result = (await response.json()) as any;
          } else if (process.env.NODE_ENV === 'development') {
            console.warn('[Tabs] Predictive API failed', response.status, await response.text());
          }
        }

        if (!result) {
          const domainGroups = new Map<
            string,
            { id: string; label: string; tabIds: string[]; confidence: number }
          >();

          for (const tab of tabs) {
            let domain = 'unknown';
            try {
              const url = tab.view?.webContents.getURL?.();
              if (url) {
                domain = new URL(url).hostname.replace(/^www\./, '');
              }
            } catch {
              domain = 'unknown';
            }

            if (!domainGroups.has(domain)) {
              domainGroups.set(domain, {
                id: `group:${domain}`,
                label: domain,
                tabIds: [],
                confidence: 0.4,
              });
            }
            domainGroups.get(domain)!.tabIds.push(tab.id);
          }

          result = {
            groups: Array.from(domainGroups.values()).filter((group) => group.tabIds.length > 1),
            prefetch: [],
            summary: {
              generatedAt: new Date().toISOString(),
              explanation: 'Domain affinity heuristic applied (offline fallback).',
            },
          };
        }

        const normalized = {
          groups:
            result.groups?.map((group) => ({
              id: group.id,
              label: group.label,
              tabIds: group.tabIds,
              confidence: group.confidence ?? 0.5,
            })) ?? [],
          prefetch:
            result.prefetch?.map((entry) => ({
              tabId: entry.tabId,
              url: entry.url,
              reason: entry.reason ?? 'Suggested continuation',
              confidence: entry.confidence ?? 0.4,
            })) ?? [],
          summary: {
            generatedAt: result.summary?.generatedAt ?? new Date().toISOString(),
            explanation: result.summary?.explanation,
          },
        };

        predictiveCache.clear();
        predictiveCache.set(cacheKey, normalized);
        return normalized;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Tabs] Predictive grouping failed', error);
        }
        return {
          groups: [],
          prefetch: [],
          summary: {
            generatedAt: new Date().toISOString(),
            explanation: 'Predictive service unavailable.',
          },
        };
      }
    }
  );

  registerHandler('tabs:activate', TabActivateRequest, async (_event, request) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Main][tabs:activate] request received:', request);
    }
    // Validate request
    if (!request.id || typeof request.id !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Main][tabs:activate] invalid request id:', request.id);
      }
      return { success: false, error: 'Invalid tab ID' };
    }
    
    // Check if tab exists before activating
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (!rec) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Main][tabs:activate] tab not found:', request.id);
      }
      // Tab doesn't exist - return error instead of trying to activate
      return { success: false, error: 'Tab not found' };
    }
    
    // Verify the tab's view is still valid
    if (!rec.view || rec.view.webContents.isDestroyed()) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Main][tabs:activate] tab view destroyed:', request.id);
      }
      // Tab's view is destroyed - remove it
      const idx = tabs.findIndex(t => t.id === request.id);
      if (idx >= 0) {
        tabs.splice(idx, 1);
      }
      return { success: false, error: 'Tab view is destroyed' };
    }
    
    // Tab exists and is valid - activate it
    setActiveTab(win, request.id);
    
    // Wake tab if sleeping
    try {
      wakeTab(request.id);
    } catch (e) {
      // Silent fail for wake - tab might not be in sleep registry
    }
    
    const active = activeTabIdByWindow.get(win.id);
    
    // Send updated tab list with URLs immediately
    // This ensures the renderer gets the update right away
    const tabList = tabs.map(t => {
      try {
        const url = t.view.webContents.getURL();
        return { 
          id: t.id, 
          title: t.view.webContents.getTitle() || 'New Tab', 
          url: url || 'about:blank',
          active: t.id === active,
          mode: t.mode,
        };
      } catch (e) {
        return {
          id: t.id,
          title: 'New Tab',
          url: 'about:blank',
          active: t.id === active,
          mode: t.mode,
        };
      }
    });

  registerHandler('tabs:wake', TabWakeRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const exists = tabs.some(t => t.id === request.id);
    if (!exists) {
      return { success: false, error: 'Tab not found' };
    }
    try {
      wakeTab(request.id);
      emit();
      return { success: true };
    } catch (error) {
      console.error('[Tabs] Failed to wake tab', error);
      return { success: false, error: (error as Error)?.message ?? 'Failed to wake tab' };
    }
  });
    
    // Send IPC events immediately (before emit()) to ensure renderer gets update
    try {
      if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('tabs:updated', tabList);
        win.webContents.send('ob://ipc/v1/tabs:updated', tabList);
        // Logging disabled to reduce console noise
        // if (process.env.NODE_ENV === 'development') {
        //   console.log('[Tabs] Sent tabs:updated event for activation:', { tabId: request.id, activeTab: active, tabCount: tabList.length });
        // }
      }
    } catch (e) {
      console.warn('Error sending tab update:', e);
    }
    
    // Also emit via the emit() function (which also sends events)
    emit();
    
    // Send navigation state for newly activated tab
    if (rec && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      // Send immediately, no delay needed
      try {
        win.webContents.send('tabs:navigation-state', {
          tabId: request.id,
          canGoBack: rec.view.webContents.canGoBack(),
          canGoForward: rec.view.webContents.canGoForward(),
        });
      } catch (e) {
        console.warn('Error sending navigation state:', e);
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Main][tabs:activate] succeeded for tab:', request.id);
    }
    return { success: true };
  });
  
  registerHandler('tabs:hibernate', TabActivateRequest, async (_event, request) => {
    hibernateTab(request.id);
    return { success: true };
  });

  registerHandler('tabs:burn', TabCloseRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (rec) {
      await burnTab(win, request.id);
      // After burning, close the tab
      const idx = tabs.findIndex(t => t.id === request.id);
      if (idx >= 0) {
        tabs.splice(idx, 1);
        unregisterTab(request.id);
        unregisterTabMemory(request.id);
        win.removeBrowserView(rec.view);
        rec.view.webContents.close();
        if (activeTabIdByWindow.get(win.id) === request.id) activeTabIdByWindow.set(win.id, null);
        
        // Emit tab update
        const active = activeTabIdByWindow.get(win.id);
        const tabList = tabs.map(t => {
          const title = t.view.webContents.getTitle() || 'New Tab';
          const url = t.view.webContents.getURL() || 'about:blank';
          return { 
            id: t.id, 
            title, 
            url,
            active: t.id === active,
            mode: t.mode,
          };
        });
        win.webContents.send('tabs:updated', tabList);
      }
    }
    return { success: true };
  });

  registerHandler('tabs:navigate', TabNavigateRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const rec = request.id === 'active' ? tabs.find(t => t.id === activeTabIdByWindow.get(win.id)) : tabs.find(t => t.id === request.id);
    if (rec) {
      // Validate and normalize URL
      let finalUrl = request.url.trim();
      
      // If it's already a valid URL, use it
      if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://') || finalUrl.startsWith('about:') || finalUrl.startsWith('chrome:')) {
        try {
          if (!finalUrl.startsWith('about:') && !finalUrl.startsWith('chrome:')) {
            const urlObj = new URL(finalUrl);
            finalUrl = urlObj.href;
          }
        } catch {
          // Invalid URL, treat as search
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(request.url)}`;
        }
      } else {
        // Check if it looks like a domain
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
        if (domainPattern.test(finalUrl) || finalUrl.includes('.')) {
          // Looks like a domain, add https://
          finalUrl = `https://${finalUrl}`;
        } else {
          // Search query
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
        }
      }
      
      try {
        await rec.view.webContents.loadURL(finalUrl);
      } catch (err: any) {
        // ERR_ABORTED (-3) is common and often harmless - it occurs when:
        // 1. A page redirects quickly (e.g., Google redirects)
        // 2. Navigation is cancelled due to another navigation
        // 3. The page loads but gets aborted for redirect reasons
        const errorCode = err?.errno || err?.code;
        const isAborted = errorCode === -3 || errorCode === 'ERR_ABORTED';
        
        if (!isAborted) {
          // Only log non-aborted errors in development
          if (process.env.NODE_ENV === 'development') {
            console.error('[Tabs] Navigation error (non-aborted):', finalUrl, err);
          }
          // For real errors, try fallback
          try {
            await rec.view.webContents.loadURL('about:blank');
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Tabs] Failed to load fallback URL:', e);
            }
          }
        } else {
          // ERR_ABORTED is often normal - navigation might still succeed via redirect
          // Don't log or take action, just let it proceed
          if (process.env.NODE_ENV === 'development') {
            console.log('[Tabs] Navigation aborted (likely redirect):', finalUrl);
          }
        }
      }
      
      // Navigation state will be updated via did-navigate event
      // Also send immediate state update
      setTimeout(() => {
        try {
          win.webContents.send('tabs:navigation-state', {
            tabId: rec.id,
            canGoBack: rec.view.webContents.canGoBack(),
            canGoForward: rec.view.webContents.canGoForward(),
          });
          emit(); // Emit tab update after navigation
        } catch (e) {
          console.error('Error sending navigation state:', e);
        }
      }, 100);
    }
    return { success: true };
  });

  registerHandler('tabs:goBack', TabGoBackRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (rec?.view.webContents.canGoBack()) {
      rec.view.webContents.goBack();
      emit();
      // Navigation state will be updated via did-navigate event
      return { success: true };
    }
    return { success: false };
  });

  registerHandler('tabs:goForward', TabGoForwardRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (rec?.view.webContents.canGoForward()) {
      rec.view.webContents.goForward();
      emit();
      // Navigation state will be updated via did-navigate event
      return { success: true };
    }
    return { success: false };
  });

  registerHandler('tabs:reload', TabReloadRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (rec) {
      rec.view.webContents.reload();
      emit();
      return { success: true };
    }
    return { success: false };
  });

  registerHandler('tabs:devtools', z.object({}), async () => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === activeTabIdByWindow.get(win.id));
    rec?.view.webContents.openDevTools({ mode: 'detach' });
    return { success: true };
  });

  registerHandler('tabs:zoomIn', z.object({ id: z.string() }), async (_event, request) => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (rec && !rec.view.webContents.isDestroyed()) {
      const currentZoom = rec.view.webContents.getZoomLevel();
      rec.view.webContents.setZoomLevel(Math.min(currentZoom + 0.5, 5)); // Max zoom 500%
      return { success: true };
    }
    return { success: false, error: 'Tab not found' };
  });

  registerHandler('tabs:zoomOut', z.object({ id: z.string() }), async (_event, request) => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (rec && !rec.view.webContents.isDestroyed()) {
      const currentZoom = rec.view.webContents.getZoomLevel();
      rec.view.webContents.setZoomLevel(Math.max(currentZoom - 0.5, -5)); // Min zoom 25%
      return { success: true };
    }
    return { success: false, error: 'Tab not found' };
  });

  registerHandler('tabs:zoomReset', z.object({ id: z.string() }), async (_event, request) => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    if (rec && !rec.view.webContents.isDestroyed()) {
      rec.view.webContents.setZoomLevel(0); // Reset to 100%
      return { success: true };
    }
    return { success: false, error: 'Tab not found' };
  });

  // Legacy handlers for backwards compatibility (wrap typed handlers)
  ipcMain.handle('tabs:list', async () => {
    const result = await (async () => {
      const tabs = getTabs(win);
      const active = activeTabIdByWindow.get(win.id);
      return tabs.map(t => {
        let url = 'about:blank';
        try {
          url = t.view.webContents.getURL() || 'about:blank';
        } catch {}
        return {
          id: t.id,
          title: t.view.webContents.getTitle() || 'New Tab',
          active: t.id === active,
          url,
          mode: t.mode,
          containerId: t.containerId,
          containerName: t.containerName,
          containerColor: t.containerColor,
          createdAt: t.createdAt,
          lastActiveAt: t.lastActiveAt,
          sessionId: t.sessionId,
          profileId: t.profileId,
        };
      });
    })();
    return result;
  });

  ipcMain.handle('tabs:create', async (
    _e,
    payload:
      | string
      | {
          url?: string;
          containerId?: string;
          profileId?: string;
          mode?: TabMode;
          tabId?: string;
          activate?: boolean;
          createdAt?: number;
          lastActiveAt?: number;
          sessionId?: string;
          fromSessionRestore?: boolean;
        },
  ) => {
    const request = typeof payload === 'string' ? { url: payload } : payload || {};
    const defaultMode: TabMode = (win as any).__ob_tabModeDefault ?? 'normal';
    return createTabInternal({
      url: request.url,
      containerId: request.containerId,
      profileId: request.profileId,
      mode: request.mode ?? defaultMode,
      id: request.tabId,
      activate: request.activate,
      createdAt: request.createdAt,
      lastActiveAt: request.lastActiveAt,
      sessionId: request.sessionId,
      fromSessionRestore: request.fromSessionRestore,
    });
  });

  ipcMain.handle('tabs:close', async (_e, id: string) => {
    const request = TabCloseRequest.parse({ id });
    const result = await (async () => {
      const tabs = getTabs(win);
      const idx = tabs.findIndex(t => t.id === request.id);
      if (idx >= 0) {
        const [rec] = tabs.splice(idx, 1);
        clearPendingBoundsTimerForTab(win.id, request.id);
        win.removeBrowserView(rec.view);
        rec.view.webContents.close();
        if (activeTabIdByWindow.get(win.id) === request.id) activeTabIdByWindow.set(win.id, null);
        emit();
      }
    })();
    return result;
  });

  ipcMain.handle('tabs:activate', async (_e, id: string) => {
    const request = TabActivateRequest.parse({ id });
    await (async () => {
      setActiveTab(win, request.id);
      emit();
    })();
  });

  ipcMain.handle('tabs:navigate', async (_e, { id, url }: { id: string; url: string }) => {
    const request = TabNavigateRequest.parse({ id, url });
    await (async () => {
      const tabs = getTabs(win);
      const rec = request.id === 'active' ? tabs.find(t => t.id === activeTabIdByWindow.get(win.id)) : tabs.find(t => t.id === request.id);
      rec?.view.webContents.loadURL(request.url);
    })();
  });

  ipcMain.handle('tabs:devtools', async () => {
    await (async () => {
      const tabs = getTabs(win);
      const rec = tabs.find(t => t.id === activeTabIdByWindow.get(win.id));
      rec?.view.webContents.openDevTools({ mode: 'detach' });
    })();
  });

  ipcMain.handle('tabs:createWithProfile', async (_e, { url, accountId }: { url: string; accountId: string }) => {
    const request = TabCreateWithProfileRequest.parse({ url, accountId });
    const defaultMode: TabMode = (win as any).__ob_tabModeDefault ?? 'normal';
    return createTabInternal({
      url: request.url,
      partitionOverride: `persist:acct:${request.accountId}`,
      mode: defaultMode,
      activate: true,
    });
  });

  // Phantom overlay: highlight + pick
  ipcMain.handle('tabs:overlay:start', async () => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === activeTabIdByWindow.get(win.id));
    if (!rec) return false;
    const js = `
      (function(){
        if (window.__omnib_overlay_active) return true;
        window.__omnib_overlay_active = true;
        const style = document.createElement('style');
        style.textContent = '.__omnib_hover{outline:2px solid #22c55e!important; cursor: crosshair!important;}';
        document.documentElement.appendChild(style);
        function getSel(el){ if(!el) return ''; if(el.id) return '#'+el.id; const p=el.parentElement; if(!p) return el.tagName.toLowerCase(); const idx=[...p.children].indexOf(el)+1; return getSel(p)+'>'+el.tagName.toLowerCase()+':nth-child('+idx+ ')'; }
        let last;
        window.__omnib_pick = '';
        window.__omnib_overlay_cleanup = ()=>{
          document.removeEventListener('mouseover', onOver, true);
          document.removeEventListener('mouseout', onOut, true);
          document.removeEventListener('click', onClick, true);
          style.remove();
          window.__omnib_overlay_active = false;
        };
        function onOver(e){ const t=e.target; if(last&&last!==t) last.classList.remove('__omnib_hover'); last=t; if(t) t.classList.add('__omnib_hover'); }
        function onOut(e){ const t=e.target; if(t) t.classList.remove('__omnib_hover'); }
        function onClick(e){ e.preventDefault(); e.stopPropagation(); const t=e.target; window.__omnib_pick = getSel(t); window.__omnib_overlay_cleanup(); }
        document.addEventListener('mouseover', onOver, true);
        document.addEventListener('mouseout', onOut, true);
        document.addEventListener('click', onClick, true);
        return true;
      })();`;
    await rec.view.webContents.executeJavaScript(js, true).catch(()=>false);
    return true;
  });

  ipcMain.handle('tabs:overlay:getPick', async () => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === activeTabIdByWindow.get(win.id));
    if (!rec) return '';
    const sel = await rec.view.webContents.executeJavaScript('window.__omnib_pick || ""', true).catch(()=> '');
    return sel;
  });

  ipcMain.handle('tabs:overlay:clear', async () => {
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === activeTabIdByWindow.get(win.id));
    if (!rec) return false;
    await rec.view.webContents.executeJavaScript('window.__omnib_overlay_cleanup && window.__omnib_overlay_cleanup()', true).catch(()=>{});
    return true;
  });

  ipcMain.handle('tabs:moveToWorkspace', async (_event, request: { tabId: string; workspaceId: string; label?: string }) => {
    const { tabId, workspaceId, label } = request;
    if (!tabId || !workspaceId) return { success: false, error: 'Missing parameters' };

    const targetWindow = BrowserWindow.fromId(Number(workspaceId));
    const tab = getTabById(tabId);
    if (!tab) return { success: false, error: 'Tab not found' };

    try {
      if (targetWindow) {
        await moveTabToWindow(tabId, targetWindow);
      } else {
        const newWin = await createWindowWithTab(tab, label || 'Workspace');
        await moveTabToWindow(tabId, newWin);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

function setActiveTab(win: BrowserWindow, id: string) {
  // Skip if window is destroyed
  if (win.isDestroyed()) {
    return;
  }
  
  // Validate tab ID
  if (!id || typeof id !== 'string') {
    return;
  }
  
  const tabs = getTabs(win);
  const rec = tabs.find(t => t.id === id);
  if (!rec) {
    // Only warn once per tab ID per minute to avoid spam
    const now = Date.now();
    const lastWarned = warnedTabIds.get(id);
    if (!lastWarned || (now - lastWarned) > WARN_CLEAR_INTERVAL) {
      warnedTabIds.set(id, now);
      // Only log in development mode to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Tab ${id} not found for activation`);
      }
    }
    return;
  }
  
  // Clear warning for this tab if it exists and is successfully activated
  warnedTabIds.delete(id);
  
  // Verify the BrowserView and webContents are still valid
  if (!rec.view || rec.view.webContents.isDestroyed()) {
    // Tab's view is destroyed - remove it from the list
    const idx = tabs.findIndex(t => t.id === id);
    if (idx >= 0) {
      tabs.splice(idx, 1);
    }
    return;
  }
  
  try {
    // Remove all BrowserViews first
    const currentViews = win.getBrowserViews();
    for (const view of currentViews) {
      try {
        win.removeBrowserView(view);
      } catch (e) {
        // Ignore errors if view is already removed
      }
    }
    
    // Set active tab ID
    activeTabIdByWindow.set(win.id, id);
    rec.lastActiveAt = Date.now();
    
    // Add the active BrowserView
    win.addBrowserView(rec.view);
    
    // Update bounds immediately (guard if destroyed)
    if (!win.isDestroyed()) {
      updateBrowserViewBounds(win, id);
    }
    
    // Force bounds update again after a brief delay to ensure proper positioning
    const timerKey = `${win.id}:${id}`;
    const existingTimer = pendingBoundsUpdateTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      pendingBoundsUpdateTimers.delete(timerKey);
    }
    const delayedBoundsUpdate = setTimeout(() => {
      pendingBoundsUpdateTimers.delete(timerKey);
      if (win.isDestroyed()) return;
      const tabsSnapshot = getTabs(win);
      const activeRecord = tabsSnapshot.find(t => t.id === id);
      if (!activeRecord || !activeRecord.view || activeRecord.view.webContents.isDestroyed()) return;
      updateBrowserViewBounds(win, id);
    }, 50);
    pendingBoundsUpdateTimers.set(timerKey, delayedBoundsUpdate);
    
    // Emit tab update with proper error handling
    const active = activeTabIdByWindow.get(win.id);
    const tabList = tabs.map(t => {
      try {
        const url = t.view.webContents.getURL();
        const title = t.view.webContents.getTitle() || 'New Tab';
        return { 
          id: t.id, 
          title, 
          url: url || 'about:blank',
          active: t.id === active,
          mode: t.mode,
          containerId: t.containerId,
          containerName: t.containerName,
          containerColor: t.containerColor,
        };
      } catch (e) {
        return {
          id: t.id,
          title: 'New Tab',
          url: 'about:blank',
          active: t.id === active,
          mode: t.mode,
          containerId: t.containerId,
          containerName: t.containerName,
          containerColor: t.containerColor,
        };
      }
    });
    
    try {
      win.webContents.send('tabs:updated', tabList);
      win.webContents.send('ob://ipc/v1/tabs:updated', tabList);
    } catch (e) {
      console.warn('Error sending tab update:', e);
    }
  } catch (e) {
    console.error('Error setting active tab:', e);
  }
}

function updateBrowserViewBounds(win: BrowserWindow, id?: string) {
  if (!win || win.isDestroyed()) return null;
  const tabId = id || activeTabIdByWindow.get(win.id);
  if (!tabId) return null;
  const tabs = getTabs(win);
  const rec = tabs.find(t => t.id === tabId);
  if (!rec) {
    console.warn(`Tab ${tabId} not found for bounds update`);
    return null;
  }
  
  try {
    // Skip if view or webContents is destroyed
    if (!rec.view || rec.view.webContents.isDestroyed()) return null;
    const bounds = win.getContentBounds();
    const right = rightDockPxByWindow.get(win.id) || 0;
    const sidebarWidth = 0; // Sidebar removed
    const topNavHeight = 56; // TopNav height
    const tabStripHeight = 40; // TabStrip height
    const bottomStatusHeight = 40; // BottomStatus height
    const top = topNavHeight + tabStripHeight;
    const bottom = bottomStatusHeight;
    
    const viewBounds = { 
      x: sidebarWidth, 
      y: top, 
      width: Math.max(0, bounds.width - sidebarWidth - right), 
      height: Math.max(0, bounds.height - top - bottom) 
    };
    
    rec.view.setBounds(viewBounds);
    try { rec.view.setAutoResize({ width: true, height: true, horizontal: false, vertical: false }); } catch {}
    
    // Ensure BrowserView is visible
    try {
      if (typeof rec.view.setVisible === 'function') {
        rec.view.setVisible(true);
      }
    } catch (e) {
      // setVisible might not exist in all Electron versions
    }
    
    return viewBounds;
  } catch (e) {
    console.error('Error updating BrowserView bounds:', e);
    return null;
  }
}

// Update BrowserView bounds on window resize
export function setupBrowserViewResize(win: BrowserWindow) {
  // Prevent duplicate listener registration per window
  if ((win as any).__ob_resize_setup) return;
  (win as any).__ob_resize_setup = true;

  const clearResizeTimer = () => {
    const existing = resizeTimers.get(win);
    if (existing) {
      clearTimeout(existing);
      resizeTimers.delete(win);
    }
  };

  const onResize = () => {
    clearResizeTimer();
    const timer = setTimeout(() => {
      resizeTimers.delete(win);
      if (win.isDestroyed()) return;
      // Check if window is in fullscreen
      if (win.isFullScreen()) {
        const display = screen.getPrimaryDisplay();
        const { width, height } = display.workAreaSize;
        const tabs = getTabs(win);
        const activeId = activeTabIdByWindow.get(win.id);
        if (activeId) {
          const rec = tabs.find(t => t.id === activeId);
          if (rec && rec.view && !rec.view.webContents.isDestroyed()) {
            try { rec.view.setBounds({ x: 0, y: 0, width, height }); } catch {}
          }
        }
      } else {
        updateBrowserViewBounds(win);
      }
    }, 100);
    resizeTimers.set(win, timer);
  };
  win.on('resize', onResize);

  // Handle fullscreen state changes
  const onEnterFs = () => {
    win.webContents.send('app:fullscreen-changed', { fullscreen: true });
    setTimeout(() => {
      if (win.isDestroyed()) return;
      const display = screen.getPrimaryDisplay();
      const { width, height } = display.workAreaSize;
      const tabs = getTabs(win);
      const activeId = activeTabIdByWindow.get(win.id);
      if (activeId) {
        const rec = tabs.find(t => t.id === activeId);
        if (rec && rec.view && !rec.view.webContents.isDestroyed()) {
          try { rec.view.setBounds({ x: 0, y: 0, width, height }); } catch {}
        }
      }
    }, 100);
  };
  win.on('enter-full-screen', onEnterFs);

  const onLeaveFs = () => {
    win.webContents.send('app:fullscreen-changed', { fullscreen: false });
    setTimeout(() => {
      if (!win.isDestroyed()) updateBrowserViewBounds(win);
    }, 100);
  };
  win.on('leave-full-screen', onLeaveFs);

  // Cleanup on close (use once to prevent duplicate listeners)
  const cleanup = () => {
    clearResizeTimer();
    try { win.removeListener('resize', onResize); } catch {}
    try { win.removeListener('enter-full-screen', onEnterFs); } catch {}
    try { win.removeListener('leave-full-screen', onLeaveFs); } catch {}
    for (const [key, timer] of pendingBoundsUpdateTimers.entries()) {
      if (key.startsWith(`${win.id}:`)) {
        clearTimeout(timer);
        pendingBoundsUpdateTimers.delete(key);
      }
    }
    // Remove from registered windows
    registeredWindows.delete(win);
  };
  
  // Only add listener if not already added
  if (!win.listenerCount('closed')) {
    win.once('closed', cleanup);
  }
}

ipcMain.handle('ui:setRightDock', (_e, px: number) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return false;
  rightDockPxByWindow.set(win.id, Math.max(0, px|0));
  const active = activeTabIdByWindow.get(win.id);
  if (active) setActiveTab(win, active);
  return true;
});

export async function createTabOnWindow(win: BrowserWindow, options: CreateTabOptions = {}) {
  const createFn = (win as any).__ob_createTab as ((opts: CreateTabOptions) => Promise<{ id: string }>) | undefined;
  if (!createFn) {
    throw new Error('Tab IPC not registered for this window');
  }
  return createFn(options);
}

export function closeAllTabs(win: BrowserWindow) {
  const closeFn = (win as any).__ob_closeAllTabs as (() => void) | undefined;
  if (closeFn) {
    closeFn();
  }
}

export function getActiveTabIdForWindow(winId: number): string | null {
  return activeTabIdByWindow.get(winId) ?? null;
}

export function activateTabByWindowId(winId: number, tabId: string) {
  try {
    const win = BrowserWindow.fromId(winId);
    if (win && !win.isDestroyed()) {
      setActiveTab(win, tabId);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('activateTabByWindowId failed:', error);
    }
  }
}


