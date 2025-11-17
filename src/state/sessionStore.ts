/**
 * Session Store - Save and restore browser sessions
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTabsStore, type Tab } from './tabsStore';

export interface Session {
  id: string;
  name: string;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    active: boolean;
    favicon?: string;
    containerId?: string;
    containerName?: string;
    mode?: 'normal' | 'ghost' | 'private';
  }>;
  createdAt: number;
  updatedAt: number;
  description?: string;
}

interface SessionStore {
  sessions: Session[];
  currentSessionId: string | null;
  saveSession: (name: string, description?: string) => string;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<Omit<Session, 'id' | 'createdAt'>>) => void;
  exportSession: (sessionId: string) => string;
  importSession: (data: string) => void;
  getSession: (sessionId: string) => Session | undefined;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      
      saveSession: (name, description) => {
        const tabs = useTabsStore.getState().tabs;
        const activeId = useTabsStore.getState().activeId;
        
        const session: Session = {
          id: crypto.randomUUID(),
          name,
          description,
          tabs: tabs.map((t) => ({
            id: t.id,
            url: t.url || 'about:blank',
            title: t.title || 'New Tab',
            active: t.id === activeId,
            favicon: undefined, // Can be enhanced
            containerId: t.containerId,
            containerName: t.containerName,
            mode: t.mode,
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSessionId: session.id,
        }));
        
        return session.id;
      },
      
      loadSession: async (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;
        
        // Close all current tabs
        const currentTabs = useTabsStore.getState().tabs;
        currentTabs.forEach((tab) => {
          useTabsStore.getState().remove(tab.id);
        });
        
        // Restore tabs from session
        const { ipc } = await import('../lib/ipc-typed');
        for (const tabData of session.tabs) {
          try {
            // Create tab via IPC
            const createdTab = await ipc.tabs.create(tabData.url);
            const createdTabId =
              typeof createdTab === 'string'
                ? createdTab
                : createdTab && typeof createdTab === 'object' && 'id' in createdTab
                ? (createdTab as { id: string }).id
                : undefined;
            // Activate if it was active in session
            if (tabData.active && createdTabId) {
              useTabsStore.getState().setActive(createdTabId);
            }
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error('[SessionStore] Failed to restore tab:', error);
          }
        }
        
        set({ currentSessionId: sessionId });
      },
      
      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        }));
      },
      
      updateSession: (sessionId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, ...updates, updatedAt: Date.now() }
              : s
          ),
        }));
      },
      
      exportSession: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return '';
        return JSON.stringify(session, null, 2);
      },
      
      importSession: (data) => {
        try {
          const session: Session = JSON.parse(data);
          // Validate session structure
          if (!session.name || !Array.isArray(session.tabs)) {
            throw new Error('Invalid session format');
          }
          
          // Generate new ID and timestamps
          session.id = crypto.randomUUID();
          session.createdAt = Date.now();
          session.updatedAt = Date.now();
          
          set((state) => ({
            sessions: [...state.sessions, session],
          }));
        } catch (e) {
          console.error('[SessionStore] Failed to import session:', e);
          throw new Error('Failed to import session: Invalid format');
        }
      },
      
      getSession: (sessionId) => {
        return get().sessions.find((s) => s.id === sessionId);
      },
    }),
    {
      name: 'omnibrowser-sessions',
    }
  )
);

