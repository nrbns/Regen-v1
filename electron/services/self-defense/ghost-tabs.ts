/**
 * Ghost Tabs - Disposable browsing contexts with self-destruct timers
 */

import { BrowserView } from 'electron';

export interface GhostTab {
  id: string;
  view: BrowserView;
  createdAt: number;
  expiresAt: number;
  autoDestruct: boolean;
}

export class GhostTabService {
  private ghostTabs: Map<string, GhostTab> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a ghost tab with self-destruct timer
   */
  createGhostTab(view: BrowserView, ttlMinutes: number = 30): string {
    const id = `ghost_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    
    const ghostTab: GhostTab = {
      id,
      view,
      createdAt: now,
      expiresAt: now + (ttlMinutes * 60 * 1000),
      autoDestruct: true,
    };

    this.ghostTabs.set(id, ghostTab);

    // Set auto-destruct timer
    if (ghostTab.autoDestruct) {
      const timer = setTimeout(() => {
        this.destruct(id);
      }, ttlMinutes * 60 * 1000);
      this.timers.set(id, timer);
    }

    return id;
  }

  /**
   * Get remaining time for ghost tab
   */
  getRemainingTime(id: string): number {
    const ghostTab = this.ghostTabs.get(id);
    if (!ghostTab) return 0;

    const remaining = ghostTab.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Extend ghost tab lifetime
   */
  extend(id: string, additionalMinutes: number): void {
    const ghostTab = this.ghostTabs.get(id);
    if (!ghostTab) return;

    // Clear existing timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Extend expiration
    ghostTab.expiresAt += additionalMinutes * 60 * 1000;

    // Set new timer
    const newTimer = setTimeout(() => {
      this.destruct(id);
    }, ghostTab.expiresAt - Date.now());
    this.timers.set(id, newTimer);
  }

  /**
   * Destruct ghost tab (clear all data)
   */
  destruct(id: string): void {
    const ghostTab = this.ghostTabs.get(id);
    if (!ghostTab) return;

    // Clear timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Clear browsing data
    const session = ghostTab.view.webContents.session;
    session.clearStorageData({
      storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
    });
    session.clearCache();
    session.clearHostResolverCache();

    // Remove from map
    this.ghostTabs.delete(id);
  }

  /**
   * Check if tab is a ghost tab
   */
  isGhostTab(id: string): boolean {
    return this.ghostTabs.has(id);
  }

  /**
   * Get all ghost tabs
   */
  getAll(): GhostTab[] {
    return Array.from(this.ghostTabs.values());
  }
}

// Singleton instance
let ghostTabInstance: GhostTabService | null = null;

export function getGhostTabService(): GhostTabService {
  if (!ghostTabInstance) {
    ghostTabInstance = new GhostTabService();
  }
  return ghostTabInstance;
}

