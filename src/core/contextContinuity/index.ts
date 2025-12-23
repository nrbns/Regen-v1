/**
 * Context Continuity - Never Lose Context
 *
 * Context must survive:
 * - Mode switches
 * - Reconnects
 * - Restarts
 * - Offline periods
 *
 * This is what makes users stop switching tools.
 */

import { eventLedger } from '../eventLedger';
import type { EventLedgerEntry as _EventLedgerEntry } from '../eventLedger/types';

export interface ContextSnapshot {
  /** Context ID */
  id: string;

  /** User ID */
  userId: string;

  /** Current mode */
  mode: string;

  /** Active tabs/workspaces */
  tabs: Array<{
    id: string;
    url?: string;
    title?: string;
    mode?: string;
  }>;

  /** Active job IDs */
  activeJobs: string[];

  /** Conversation history */
  conversation: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;

  /** Memory/state */
  memory: Record<string, any>;

  /** Timestamp */
  timestamp: number;
}

class ContextContinuity {
  private currentContext: ContextSnapshot | null = null;
  private CONTEXT_KEY = 'regen:context:current';

  /**
   * Save current context
   */
  async save(context: Omit<ContextSnapshot, 'id' | 'timestamp'>): Promise<ContextSnapshot> {
    const snapshot: ContextSnapshot = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...context,
    };

    this.currentContext = snapshot;

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.CONTEXT_KEY, JSON.stringify(snapshot));
      } catch (error) {
        console.error('[ContextContinuity] Failed to persist context:', error);
      }
    }

    // Log context save
    await eventLedger.log({
      type: 'context:save',
      userId: snapshot.userId,
      data: {
        contextId: snapshot.id,
        mode: snapshot.mode,
        activeJobs: snapshot.activeJobs,
        tabsCount: snapshot.tabs.length,
      },
      stateSnapshot: snapshot,
      reasoning: `Context saved for mode ${snapshot.mode}`,
    });

    return snapshot;
  }

  /**
   * Restore context (on startup/reconnect)
   */
  async restore(userId: string): Promise<ContextSnapshot | null> {
    // Try in-memory first
    if (this.currentContext && this.currentContext.userId === userId) {
      return this.currentContext;
    }

    // Try localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.CONTEXT_KEY);
        if (stored) {
          const snapshot = JSON.parse(stored) as ContextSnapshot;
          if (snapshot.userId === userId) {
            this.currentContext = snapshot;

            // Log context restore
            await eventLedger.log({
              type: 'context:restore',
              userId,
              data: {
                contextId: snapshot.id,
                mode: snapshot.mode,
                activeJobs: snapshot.activeJobs,
                tabsCount: snapshot.tabs.length,
              },
              stateSnapshot: snapshot,
              reasoning: `Context restored for mode ${snapshot.mode}`,
            });

            return snapshot;
          }
        }
      } catch (error) {
        console.error('[ContextContinuity] Failed to restore context:', error);
      }
    }

    return null;
  }

  /**
   * Update context (incremental updates)
   */
  async update(
    updates: Partial<Omit<ContextSnapshot, 'id' | 'userId' | 'timestamp'>>
  ): Promise<ContextSnapshot | null> {
    if (!this.currentContext) {
      console.warn('[ContextContinuity] No context to update');
      return null;
    }

    const updated: ContextSnapshot = {
      ...this.currentContext,
      ...updates,
      timestamp: Date.now(),
    };

    this.currentContext = updated;

    // Persist
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.CONTEXT_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('[ContextContinuity] Failed to update context:', error);
      }
    }

    // Log update
    await eventLedger.log({
      type: 'context:save',
      userId: updated.userId,
      data: {
        contextId: updated.id,
        updates: Object.keys(updates),
      },
      reasoning: 'Context updated',
    });

    return updated;
  }

  /**
   * Handle mode switch - preserve context
   */
  async switchMode(newMode: string): Promise<void> {
    if (!this.currentContext) {
      console.warn('[ContextContinuity] No context to switch mode');
      return;
    }

    // Log mode switch
    await eventLedger.log({
      type: 'context:switch',
      userId: this.currentContext.userId,
      data: {
        fromMode: this.currentContext.mode,
        toMode: newMode,
        contextId: this.currentContext.id,
      },
      reasoning: `Mode switched from ${this.currentContext.mode} to ${newMode}`,
    });

    // Update mode but preserve everything else
    await this.update({ mode: newMode });
  }

  /**
   * Get current context
   */
  getCurrent(): ContextSnapshot | null {
    return this.currentContext;
  }

  /**
   * Clear context (logout/reset)
   */
  async clear(userId: string): Promise<void> {
    if (this.currentContext?.userId === userId) {
      this.currentContext = null;

      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.CONTEXT_KEY);
      }

      await eventLedger.log({
        type: 'context:save',
        userId,
        data: { action: 'clear' },
        reasoning: 'Context cleared',
      });
    }
  }

  /**
   * Rebuild context from event ledger (for crash recovery)
   */
  async rebuildFromLedger(
    userId: string,
    maxEvents: number = 1000
  ): Promise<ContextSnapshot | null> {
    // Get recent context events
    const events = await eventLedger.query({
      userId,
      type: ['context:save', 'context:switch'],
      limit: maxEvents,
    });

    if (events.length === 0) return null;

    // Find the most recent context:save event
    const lastSave = events
      .filter(e => e.type === 'context:save' && e.stateSnapshot)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastSave?.stateSnapshot) {
      const snapshot = lastSave.stateSnapshot as ContextSnapshot;
      this.currentContext = snapshot;

      // Persist
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(this.CONTEXT_KEY, JSON.stringify(snapshot));
        } catch (error) {
          console.error('[ContextContinuity] Failed to persist rebuilt context:', error);
        }
      }

      return snapshot;
    }

    return null;
  }
}

export const contextContinuity = new ContextContinuity();

// Auto-restore on startup
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    // Try to get userId from sessionStore or localStorage
    try {
      const userId = localStorage.getItem('regen:userId') || 'anonymous';
      const restored = await contextContinuity.restore(userId);
      if (!restored) {
        // Try rebuilding from ledger
        await contextContinuity.rebuildFromLedger(userId);
      }
    } catch (error) {
      console.error('[ContextContinuity] Failed to restore context on startup:', error);
    }
  });
}
