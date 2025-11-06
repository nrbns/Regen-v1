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
} from '../shared/ipc/schema';

type TabRecord = {
  id: string;
  view: BrowserView;
  partition: string;
  sessionId?: string; // Track which session this tab belongs to
};

const windowIdToTabs = new Map<number, TabRecord[]>();
let activeTabIdByWindow = new Map<number, string | null>();
let rightDockPxByWindow = new Map<number, number>();

export function getTabs(win: BrowserWindow) {
  if (!windowIdToTabs.has(win.id)) windowIdToTabs.set(win.id, []);
  return windowIdToTabs.get(win.id)!;
}

export function registerTabIpc(win: BrowserWindow) {
  setupBrowserViewResize(win);
  const emit = () => {
    const tabs = getTabs(win);
    const active = activeTabIdByWindow.get(win.id);
    const tabList = tabs.map(t => {
      const title = t.view.webContents.getTitle() || 'New Tab';
      const url = t.view.webContents.getURL() || 'about:blank';
      return { 
        id: t.id, 
        title, 
        url,
        active: t.id === active 
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
        };
      } catch (e) {
        // If webContents is destroyed, return basic info
        return {
          id: t.id,
          title: 'New Tab',
          active: t.id === active,
          url: 'about:blank',
        };
      }
    }) as z.infer<typeof TabListResponse>;
  });

  registerHandler('tabs:create', TabCreateRequest, async (_event, request) => {
    const id = randomUUID();
    
    // Get partition from active session or profile
    // Enhanced with site isolation: each origin gets its own partition for security
    let partition: string;
    let basePartition: string;
    
    if (request.profileId) {
      basePartition = `persist:profile:${request.profileId}`;
    } else {
      const sessionManager = getSessionManager();
      const activeSession = sessionManager.getActiveSession();
      if (activeSession) {
        basePartition = sessionManager.getSessionPartition(activeSession.id);
      } else {
        basePartition = `ephemeral:${randomUUID()}`; // Ephemeral container
      }
    }
    
    // Add site isolation: hash origin to create unique partition per site
    try {
      const url = new URL(request.url || 'about:blank');
      const origin = url.origin;
      const originHash = createHash('sha256').update(origin).digest('hex').slice(0, 16);
      partition = `${basePartition}:site:${originHash}`;
    } catch {
      // Fallback to base partition if URL parsing fails
      partition = basePartition;
    }
    
    const sess = session.fromPartition(partition);
    
    // Determine session for this tab
    const sessionManager = getSessionManager();
    const activeSession = sessionManager.getActiveSession();
    const sessionId = activeSession?.id || 'default';
    
    // Configure BrowserView with proper settings for video playback
    const view = new BrowserView({ 
      webPreferences: { 
        session: sess, 
        contextIsolation: true, 
        sandbox: false, // YouTube videos require sandbox: false for proper playback
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        // Enable plugins and autoplay for video sites
        plugins: true,
        autoplayPolicy: 'no-user-gesture-required',
      } 
    });
    
    // Set up fullscreen handlers
    view.webContents.on('enter-html-full-screen', () => { 
      try { 
        win.setFullScreen(true);
        // Notify renderer about fullscreen state
        win.webContents.send('app:fullscreen-changed', { fullscreen: true });
        // Wait for fullscreen to be set, then resize BrowserView
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
        // Notify renderer about fullscreen state
        win.webContents.send('app:fullscreen-changed', { fullscreen: false });
        // Restore BrowserView to normal bounds
        setTimeout(() => {
          updateBrowserViewBounds(win, id);
        }, 100);
      } catch (e) {
        console.error('Failed to leave fullscreen:', e);
      } 
    });
    
    // Set up media permissions for video playback
    sess.setPermissionRequestHandler((_wc, permission, callback) => {
      // Allow all media-related permissions for video sites
      if (['media', 'display-capture', 'notifications'].includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    });
    
    // Set up permission check handler
    sess.setPermissionCheckHandler((_wc, permission, _origin) => {
      // Allow media permissions
      if (permission === 'media') {
        return true;
      }
      return false;
    });
    
    view.webContents.loadURL(request.url || 'about:blank').catch(()=>{});
    view.webContents.on('page-title-updated', () => emit());
    view.webContents.on('did-navigate', async (_e2, navUrl) => {
      emit();
      
      // Inject shields protection (only for non-video sites)
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
      
      try {
        const title = view.webContents.getTitle();
        const hostname = new URL(navUrl).hostname;
        pushHistory(navUrl, title || navUrl);
        win.webContents.send('history:updated');
        // Simple entity extraction: top capitalized tokens from body text
        const text: string = await view.webContents.executeJavaScript('document.body.innerText.slice(0,5000)', true).catch(()=> '');
        const entities = Array.from(new Set((text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).slice(0, 10)));
        addToGraph({ key: navUrl, title, type: 'page' }, [ { src: hostname, dst: navUrl, rel: 'contains', weight: 1 } ]);
        addToGraph({ key: hostname, title: hostname, type: 'site' });
        for (const ent of entities) addToGraph({ key: `ent:${ent}`, title: ent, type: 'entity' }, [{ src: navUrl, dst: `ent:${ent}`, rel: 'mentions', weight: 1 }]);
      } catch {}
    });
    
    // Inject shields on DOM ready (skip for video sites)
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
    const tabs = getTabs(win);
    tabs.push({ id, view, partition, sessionId });
    setActiveTab(win, id);
    
    // Update session tab count
    const sessionTabs = tabs.filter(t => t.sessionId === sessionId);
    sessionManager.updateTabCount(sessionId, sessionTabs.length, id);
    
    emit();
    
    // Setup video call optimizer for video calling sites
    const optimizer = getVideoCallOptimizer();
    view.webContents.once('did-finish-load', () => {
      const url = view.webContents.getURL();
      if (url) {
        optimizer.setupForWebContents(view.webContents, url);
      }
    });
    
    return { id } as TabCreateResponse;
  });

  registerHandler('tabs:createWithProfile', TabCreateWithProfileRequest, async (_event, request) => {
    const id = randomUUID();
    const partition = `persist:acct:${request.accountId}`;
    const sess = session.fromPartition(partition);
    
    // Configure BrowserView with proper settings for video playback
    const view = new BrowserView({ 
      webPreferences: { 
        session: sess, 
        contextIsolation: true, 
        sandbox: false, // YouTube videos require sandbox: false
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        plugins: true,
        autoplayPolicy: 'no-user-gesture-required',
      } 
    });
    
    // Set up fullscreen handlers
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
        setTimeout(() => {
          updateBrowserViewBounds(win, id);
        }, 100);
      } catch (e) {
        console.error('Failed to leave fullscreen:', e);
      } 
    });
    
    // Set up media permissions
    sess.setPermissionRequestHandler((_wc, permission, callback) => {
      if (['media', 'display-capture', 'notifications'].includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    });
    
    sess.setPermissionCheckHandler((_wc, permission, _origin) => {
      if (permission === 'media') {
        return true;
      }
      return false;
    });
    
    // Set up navigation state tracking
    const sendNavigationState = () => {
      win.webContents.send('tabs:navigation-state', {
        tabId: id,
        canGoBack: view.webContents.canGoBack(),
        canGoForward: view.webContents.canGoForward(),
      });
    };
    
    view.webContents.loadURL(request.url || 'about:blank').catch(()=>{});
    view.webContents.on('page-title-updated', async () => {
      emit();
      // Update history with new title when page title updates
      try {
        const currentUrl = view.webContents.getURL();
        if (currentUrl && !currentUrl.startsWith('about:') && !currentUrl.startsWith('chrome:')) {
          const title = view.webContents.getTitle();
          pushHistory(currentUrl, title || currentUrl);
          win.webContents.send('history:updated');
        }
      } catch {}
    });
    view.webContents.on('did-navigate', async (_e2, navUrl) => {
      emit();
      sendNavigationState();
      try {
        const title = view.webContents.getTitle();
        const hostname = new URL(navUrl).hostname;
        pushHistory(navUrl, title || navUrl);
        win.webContents.send('history:updated');
        const text: string = await view.webContents.executeJavaScript('document.body.innerText.slice(0,5000)', true).catch(()=> '');
        const entities = Array.from(new Set((text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).slice(0, 10)));
        addToGraph({ key: navUrl, title, type: 'page' }, [ { src: hostname, dst: navUrl, rel: 'contains', weight: 1 } ]);
        addToGraph({ key: hostname, title: hostname, type: 'site' });
        for (const ent of entities) addToGraph({ key: `ent:${ent}`, title: ent, type: 'entity' }, [{ src: navUrl, dst: `ent:${ent}`, rel: 'mentions', weight: 1 }]);
      } catch {}
    });

    view.webContents.on('did-navigate-in-page', () => {
      sendNavigationState();
    });
    
    const tabs = getTabs(win);
    tabs.push({ id, view, partition });
    setActiveTab(win, id);
    emit();
    
    // Setup video call optimizer for video calling sites
    const optimizer = getVideoCallOptimizer();
    view.webContents.once('did-finish-load', () => {
      const url = view.webContents.getURL();
      if (url) {
        optimizer.setupForWebContents(view.webContents, url);
      }
    });
    
    // Send initial navigation state after a brief delay to ensure page has loaded
    setTimeout(() => sendNavigationState(), 100);
    return { id } as TabCreateResponse;
  });

  registerHandler('tabs:close', TabCloseRequest, async (_event, request) => {
    const tabs = getTabs(win);
    const idx = tabs.findIndex(t => t.id === request.id);
    if (idx < 0) {
      return { success: false, error: 'Tab not found' };
    }
    
    const [rec] = tabs.splice(idx, 1);
    const wasActive = activeTabIdByWindow.get(win.id) === request.id;
    
    // Unregister from sleep and memory monitoring
    try {
      unregisterTab(request.id);
      unregisterTabMemory(request.id);
    } catch (e) {
      console.warn('Error unregistering tab:', e);
    }
    
    // Update session tab count
    if (rec.sessionId) {
      try {
        const sessionManager = getSessionManager();
        const sessionTabs = tabs.filter(t => t.sessionId === rec.sessionId);
        sessionManager.updateTabCount(rec.sessionId, sessionTabs.length);
      } catch (e) {
        console.warn('Error updating session tab count:', e);
      }
    }
    
    // Close BrowserView and webContents
    try {
      win.removeBrowserView(rec.view);
      rec.view.webContents.close();
    } catch (e) {
      console.error('Error closing tab BrowserView:', e);
    }
    
    // If the closed tab was active, activate another tab
    if (wasActive) {
      if (tabs.length > 0) {
        // Activate the tab at the same index, or the last tab if at the end
        const nextTab = tabs[Math.min(idx, tabs.length - 1)];
        if (nextTab) {
          setActiveTab(win, nextTab.id);
        } else {
          activeTabIdByWindow.set(win.id, null);
        }
      } else {
        // No tabs left, clear active tab
        activeTabIdByWindow.set(win.id, null);
      }
    }
    
    // Emit tab update immediately
    emit();
    
    return { success: true };
  });

  registerHandler('tabs:activate', TabActivateRequest, async (_event, request) => {
    setActiveTab(win, request.id);
    
    // Wake tab if sleeping
    try {
      wakeTab(request.id);
    } catch (e) {
      console.warn('Error waking tab:', e);
    }
    
    const tabs = getTabs(win);
    const rec = tabs.find(t => t.id === request.id);
    const active = activeTabIdByWindow.get(win.id);
    
    // Send updated tab list with URLs
    const tabList = tabs.map(t => {
      try {
        const url = t.view.webContents.getURL();
        return { 
          id: t.id, 
          title: t.view.webContents.getTitle() || 'New Tab', 
          url: url || 'about:blank',
          active: t.id === active 
        };
      } catch (e) {
        return {
          id: t.id,
          title: 'New Tab',
          url: 'about:blank',
          active: t.id === active,
        };
      }
    });
    
    try {
      win.webContents.send('tabs:updated', tabList);
      win.webContents.send('ob://ipc/v1/tabs:updated', tabList);
    } catch (e) {
      console.warn('Error sending tab update:', e);
    }
    
    // Send navigation state for newly activated tab
    if (rec) {
      setTimeout(() => {
        try {
          win.webContents.send('tabs:navigation-state', {
            tabId: request.id,
            canGoBack: rec.view.webContents.canGoBack(),
            canGoForward: rec.view.webContents.canGoForward(),
          });
        } catch (e) {
          console.warn('Error sending navigation state:', e);
        }
      }, 100);
    }
    
    // Force emit to ensure UI updates
    emit();
    
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
            active: t.id === active 
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
      } catch (err) {
        console.error('Failed to navigate to URL:', finalUrl, err);
        // Fallback to about:blank if load fails
        try {
          await rec.view.webContents.loadURL('about:blank');
        } catch (e) {
          console.error('Failed to load fallback URL:', e);
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

  // Legacy handlers for backwards compatibility (wrap typed handlers)
  ipcMain.handle('tabs:list', async () => {
    const result = await (async () => {
      const tabs = getTabs(win);
      const active = activeTabIdByWindow.get(win.id);
      return tabs.map(t => ({ id: t.id, title: t.view.webContents.getTitle() || 'New Tab', active: t.id === active }));
    })();
    return result;
  });

  ipcMain.handle('tabs:create', async (_e, url: string) => {
    // Convert legacy format to typed format
    const request = TabCreateRequest.parse({ url });
    const response = await (async () => {
      const id = randomUUID();
      const partition = request.profileId ? `persist:profile:${request.profileId}` : 'persist:default';
      const sess = session.fromPartition(partition);
      
      const view = new BrowserView({ 
        webPreferences: { 
          session: sess, 
          contextIsolation: true, 
          sandbox: false, // Required for video playback
          nodeIntegration: false,
          webSecurity: true,
          plugins: true,
          autoplayPolicy: 'no-user-gesture-required',
        } 
      });
      
      view.webContents.on('enter-html-full-screen', () => { 
        try { 
          win.setFullScreen(true);
          win.webContents.send('app:fullscreen-changed', { fullscreen: true });
          setTimeout(() => {
            const display = screen.getPrimaryDisplay();
            const { width, height } = display.workAreaSize;
            view.setBounds({ x: 0, y: 0, width, height });
          }, 100);
        } catch {} 
      });
      view.webContents.on('leave-html-full-screen', () => { 
        try { 
          win.setFullScreen(false);
          win.webContents.send('app:fullscreen-changed', { fullscreen: false });
          setTimeout(() => {
            updateBrowserViewBounds(win, id);
          }, 100);
        } catch {} 
      });
      
      // Set up media permissions
      sess.setPermissionRequestHandler((_wc, permission, callback) => {
        if (['media', 'display-capture', 'notifications'].includes(permission)) {
          callback(true);
        } else {
          callback(false);
        }
      });
      
      sess.setPermissionCheckHandler((_wc, permission, _origin) => {
        if (permission === 'media') {
          return true;
        }
        return false;
      });
      
      view.webContents.loadURL(request.url || 'about:blank').catch(()=>{});
      view.webContents.on('page-title-updated', () => emit());
      view.webContents.on('did-navigate', async (_e2, navUrl) => {
        emit();
        try {
          const title = view.webContents.getTitle();
          const hostname = new URL(navUrl).hostname;
          pushHistory(navUrl, title || navUrl);
          win.webContents.send('history:updated');
          const text: string = await view.webContents.executeJavaScript('document.body.innerText.slice(0,5000)', true).catch(()=> '');
          const entities = Array.from(new Set((text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).slice(0, 10)));
          addToGraph({ key: navUrl, title, type: 'page' }, [ { src: hostname, dst: navUrl, rel: 'contains', weight: 1 } ]);
          addToGraph({ key: hostname, title: hostname, type: 'site' });
          for (const ent of entities) addToGraph({ key: `ent:${ent}`, title: ent, type: 'entity' }, [{ src: navUrl, dst: `ent:${ent}`, rel: 'mentions', weight: 1 }]);
        } catch {}
      });
      
      // Setup video call optimizer
      const optimizer = getVideoCallOptimizer();
      view.webContents.once('did-finish-load', () => {
        const url = view.webContents.getURL();
        if (url) {
          optimizer.setupForWebContents(view.webContents, url);
        }
      });
      
      const tabs = getTabs(win);
      tabs.push({ id, view, partition });
      setActiveTab(win, id);
      emit();
      return id;
    })();
    return response;
  });

  ipcMain.handle('tabs:close', async (_e, id: string) => {
    const request = TabCloseRequest.parse({ id });
    const result = await (async () => {
      const tabs = getTabs(win);
      const idx = tabs.findIndex(t => t.id === request.id);
      if (idx >= 0) {
        const [rec] = tabs.splice(idx, 1);
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
    const result = await (async () => {
      const id = randomUUID();
      const partition = `persist:acct:${request.accountId}`;
      const sess = session.fromPartition(partition);
      
      const view = new BrowserView({ 
        webPreferences: { 
          session: sess, 
          contextIsolation: true, 
          sandbox: false, // Required for video playback
          nodeIntegration: false,
          webSecurity: true,
          plugins: true,
          autoplayPolicy: 'no-user-gesture-required',
        } 
      });
      
      view.webContents.on('enter-html-full-screen', () => { 
        try { 
          win.setFullScreen(true);
          win.webContents.send('app:fullscreen-changed', { fullscreen: true });
          setTimeout(() => {
            const display = screen.getPrimaryDisplay();
            const { width, height } = display.workAreaSize;
            view.setBounds({ x: 0, y: 0, width, height });
          }, 100);
        } catch {} 
      });
      view.webContents.on('leave-html-full-screen', () => { 
        try { 
          win.setFullScreen(false);
          win.webContents.send('app:fullscreen-changed', { fullscreen: false });
          setTimeout(() => {
            updateBrowserViewBounds(win, id);
          }, 100);
        } catch {} 
      });
      
      // Set up media permissions
      sess.setPermissionRequestHandler((_wc, permission, callback) => {
        if (['media', 'display-capture', 'notifications'].includes(permission)) {
          callback(true);
        } else {
          callback(false);
        }
      });
      
      sess.setPermissionCheckHandler((_wc, permission, _origin) => {
        if (permission === 'media') {
          return true;
        }
        return false;
      });
      
      view.webContents.loadURL(request.url || 'about:blank').catch(()=>{});
      view.webContents.on('page-title-updated', () => emit());
      view.webContents.on('did-navigate', async (_e2, navUrl) => {
        emit();
        try {
          const title = view.webContents.getTitle();
          const hostname = new URL(navUrl).hostname;
          pushHistory(navUrl, title || navUrl);
          win.webContents.send('history:updated');
          const text: string = await view.webContents.executeJavaScript('document.body.innerText.slice(0,5000)', true).catch(()=> '');
          const entities = Array.from(new Set((text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).slice(0, 10)));
          addToGraph({ key: navUrl, title, type: 'page' }, [ { src: hostname, dst: navUrl, rel: 'contains', weight: 1 } ]);
          addToGraph({ key: hostname, title: hostname, type: 'site' });
          for (const ent of entities) addToGraph({ key: `ent:${ent}`, title: ent, type: 'entity' }, [{ src: navUrl, dst: `ent:${ent}`, rel: 'mentions', weight: 1 }]);
        } catch {}
      });
      const tabs = getTabs(win);
      tabs.push({ id, view, partition });
      setActiveTab(win, id);
      
      // Register for sleep and memory monitoring
      registerTab(id, view);
      registerTabMemory(id, view);
      
      emit();
      return id;
    })();
    return result;
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
}

function setActiveTab(win: BrowserWindow, id: string) {
  const tabs = getTabs(win);
  const rec = tabs.find(t => t.id === id);
  if (!rec) {
    console.warn(`Tab ${id} not found for activation`);
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
    
    // Add the active BrowserView
    win.addBrowserView(rec.view);
    
    // Update bounds immediately (guard if destroyed)
    if (!win.isDestroyed()) {
      updateBrowserViewBounds(win, id);
    }
    
    // Force bounds update again after a brief delay to ensure proper positioning
    setTimeout(() => {
      if (!win.isDestroyed()) {
        updateBrowserViewBounds(win, id);
      }
    }, 50);
    
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
          active: t.id === active 
        };
      } catch (e) {
        return {
          id: t.id,
          title: 'New Tab',
          url: 'about:blank',
          active: t.id === active,
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
let resizeTimer: NodeJS.Timeout | null = null;
export function setupBrowserViewResize(win: BrowserWindow) {
  // Prevent duplicate listener registration per window
  if ((win as any).__ob_resize_setup) return;
  (win as any).__ob_resize_setup = true;

  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
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

  // Cleanup on close
  win.once('closed', () => {
    if (resizeTimer) { clearTimeout(resizeTimer); resizeTimer = null; }
    try { win.removeListener('resize', onResize); } catch {}
    try { win.removeListener('enter-full-screen', onEnterFs); } catch {}
    try { win.removeListener('leave-full-screen', onLeaveFs); } catch {}
  });
}

ipcMain.handle('ui:setRightDock', (_e, px: number) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return false;
  rightDockPxByWindow.set(win.id, Math.max(0, px|0));
  const active = activeTabIdByWindow.get(win.id);
  if (active) setActiveTab(win, active);
  return true;
});


