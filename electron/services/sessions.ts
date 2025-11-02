/**
 * Multi-Session Manager
 * Handles multiple concurrent browser sessions (multi-login accounts)
 */

import { session, Session } from 'electron';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'events';
import { getProfile, listProfiles, createProfile, ProfileData } from './profiles';

export interface BrowserSession {
  id: string;
  name: string;
  profileId: string;
  createdAt: number;
  tabCount: number;
  activeTabId?: string;
  color?: string; // Visual identifier color
}

class SessionManager extends EventEmitter {
  private sessions = new Map<string, BrowserSession>();
  private activeSessionId: string | null = null;
  private defaultSession: BrowserSession | null = null;

  constructor() {
    super();
    this.initializeDefaultSession();
  }

  /**
   * Initialize default session
   */
  private initializeDefaultSession(): void {
    const defaultSession: BrowserSession = {
      id: 'default',
      name: 'Default',
      profileId: 'default',
      createdAt: Date.now(),
      tabCount: 0,
      color: '#3b82f6', // Blue
    };
    
    this.sessions.set('default', defaultSession);
    this.activeSessionId = 'default';
    this.defaultSession = defaultSession;
    this.emit('session-created', defaultSession);
  }

  /**
   * Create a new session
   */
  createSession(name: string, profileId?: string, color?: string): BrowserSession {
    const sessionId = randomUUID();
    
    // If profileId not provided, create a new profile
    let actualProfileId = profileId;
    if (!actualProfileId) {
      const profile = createProfile(name);
      actualProfileId = profile.id;
    }

    const newSession: BrowserSession = {
      id: sessionId,
      name,
      profileId: actualProfileId,
      createdAt: Date.now(),
      tabCount: 0,
      color: color || this.generateColor(),
    };

    this.sessions.set(sessionId, newSession);
    this.emit('session-created', newSession);
    
    return newSession;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get active session
   */
  getActiveSession(): BrowserSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Set active session
   */
  setActiveSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) return false;
    
    const oldSessionId = this.activeSessionId;
    this.activeSessionId = sessionId;
    
    this.emit('session-changed', {
      oldSessionId,
      newSessionId: sessionId,
      session: this.sessions.get(sessionId),
    });
    
    return true;
  }

  /**
   * List all sessions
   */
  listSessions(): BrowserSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => 
      (b.activeTabId ? 1 : 0) - (a.activeTabId ? 1 : 0) || a.createdAt - b.createdAt
    );
  }

  /**
   * Update session tab count
   */
  updateTabCount(sessionId: string, count: number, activeTabId?: string): void {
    const sess = this.sessions.get(sessionId);
    if (!sess) return;
    
    sess.tabCount = count;
    sess.activeTabId = activeTabId;
    this.emit('session-updated', sess);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    if (sessionId === 'default') return false; // Can't delete default session
    
    const sess = this.sessions.get(sessionId);
    if (!sess) return false;
    
    // If this was the active session, switch to default
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = 'default';
    }
    
    this.sessions.delete(sessionId);
    this.emit('session-deleted', sessionId);
    
    return true;
  }

  /**
   * Get session for a tab (by profile partition)
   */
  getSessionForProfile(profileId: string): BrowserSession | null {
    for (const sess of this.sessions.values()) {
      if (sess.profileId === profileId) {
        return sess;
      }
    }
    return null;
  }

  /**
   * Generate a random color for session
   */
  private generateColor(): string {
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#f97316', // Orange
    ];
    
    const usedColors = Array.from(this.sessions.values())
      .map(s => s.color)
      .filter(Boolean) as string[];
    
    const available = colors.filter(c => !usedColors.includes(c));
    return available.length > 0 ? available[0] : colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get partition string for a session
   */
  getSessionPartition(sessionId: string): string {
    const sess = this.sessions.get(sessionId);
    if (!sess) return 'persist:default';
    
    if (sess.profileId === 'default') {
      return 'persist:default';
    }
    
    const profile = getProfile(sess.profileId);
    return profile ? profile.partition : `persist:profile:${sess.profileId}`;
  }
}

let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

