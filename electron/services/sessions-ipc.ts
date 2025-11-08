/**
 * IPC handlers for multi-session management
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getSessionManager } from './sessions';
import { BrowserWindow } from 'electron';
import { getTabs } from './tabs';

// Helper function to close tabs by session ID
function closeTabsBySession(win: BrowserWindow, sessionId: string): void {
  const tabs = getTabs(win);
  const sessionTabs = tabs.filter(t => t.sessionId === sessionId);
  
  for (const tab of sessionTabs) {
    try {
      win.removeBrowserView(tab.view);
      tab.view.webContents.close();
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  }
  
  // Remove tabs from array
  const tabIdsToRemove = new Set(sessionTabs.map(t => t.id));
  const index = tabs.length;
  for (let i = tabs.length - 1; i >= 0; i--) {
    if (tabIdsToRemove.has(tabs[i].id)) {
      tabs.splice(i, 1);
    }
  }
}

export function registerSessionsIpc() {
  const sessionManager = getSessionManager();

  // Create new session
  registerHandler('sessions:create', z.object({
    name: z.string().min(1),
    profileId: z.string().optional(),
    color: z.string().optional(),
  }), async (_event, request) => {
    const newSession = sessionManager.createSession(request.name, request.profileId, request.color);
    return newSession;
  });

  // List all sessions
  registerHandler('sessions:list', z.object({}), async (event) => {
    const sessions = sessionManager.listSessions();
    // Update tab counts for each session
    const sessionsWithTabCounts = sessions.map(session => {
      // Count tabs for this session
      if (event?.sender) {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
          const tabs = getTabs(win);
          const sessionTabs = tabs.filter(t => t.sessionId === session.id);
          return { ...session, tabCount: sessionTabs.length };
        }
      }
      return session;
    });
    return sessionsWithTabCounts;
  });

  // Get active session
  registerHandler('sessions:getActive', z.object({}), async () => {
    return sessionManager.getActiveSession();
  });

  // Set active session
  registerHandler('sessions:setActive', z.object({
    sessionId: z.string(),
  }), async (event, request) => {
    const success = sessionManager.setActiveSession(request.sessionId);
    
    if (success && event.sender) {
      // Notify renderer that session has changed
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        // Emit tab updates so UI refreshes
        win.webContents.send('session:switched', { sessionId: request.sessionId });
        
        // Refresh tab list to show only tabs for new session
        const tabs = getTabs(win);
        const active = tabs.find(t => t.sessionId === request.sessionId);
        if (active) {
          // Find first tab of new session to activate
          const newSessionTabs = tabs.filter(t => t.sessionId === request.sessionId);
          if (newSessionTabs.length > 0) {
            // Tab activation will be handled by tabs:activate
        win.webContents.send('tabs:updated', newSessionTabs.map(t => ({
              id: t.id,
              title: t.view.webContents.getTitle() || 'New Tab',
              url: t.view.webContents.getURL() || 'about:blank',
          active: false,
          mode: t.mode,
            })));
          }
        }
      }
    }
    
    return { success };
  });

  // Get session by ID
  registerHandler('sessions:get', z.object({
    sessionId: z.string(),
  }), async (_event, request) => {
    const sess = sessionManager.getSession(request.sessionId);
    if (!sess) {
      throw new Error('Session not found');
    }
    return sess;
  });

  // Delete session
  registerHandler('sessions:delete', z.object({
    sessionId: z.string(),
  }), async (event, request) => {
    // Close all tabs belonging to this session
    if (event.sender) {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        closeTabsBySession(win, request.sessionId);
        
        // Emit tab update after closing
        const tabs = getTabs(win);
        win.webContents.send('tabs:updated', tabs.map(t => ({
          id: t.id,
          title: t.view.webContents.getTitle() || 'New Tab',
          url: t.view.webContents.getURL() || 'about:blank',
          active: false,
          mode: t.mode,
        })));
      }
    }
    
    const success = sessionManager.deleteSession(request.sessionId);
    return { success };
  });

  // Update session (name, color, etc.)
  registerHandler('sessions:update', z.object({
    sessionId: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
  }), async (_event, request) => {
    const sess = sessionManager.getSession(request.sessionId);
    if (!sess) {
      throw new Error('Session not found');
    }
    
    if (request.name !== undefined) sess.name = request.name;
    if (request.color !== undefined) sess.color = request.color;
    
    return sess;
  });

  // Get session partition for tab creation
  registerHandler('sessions:getPartition', z.object({
    sessionId: z.string(),
  }), async (_event, request) => {
    return { partition: sessionManager.getSessionPartition(request.sessionId) };
  });
}

