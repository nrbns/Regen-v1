/**
 * Event Ledger - Central System
 *
 * This is THE system that makes Regen deterministic.
 *
 * Usage:
 *
 * ```ts
 * import { eventLedger } from '@/core/eventLedger';
 *
 * // Log every AI action
 * await eventLedger.log({
 *   type: 'ai:action:start',
 *   jobId: 'job-123',
 *   data: { action: 'research', query: '...' },
 *   confidence: 0.95,
 *   sources: ['source1', 'source2'],
 *   reasoning: 'User requested research...'
 * });
 *
 * // Replay events for a job
 * const replay = await eventLedger.replay('job-123');
 *
 * // Query events
 * const events = await eventLedger.query({
 *   jobId: 'job-123',
 *   type: 'ai:reasoning'
 * });
 * ```
 */

import { eventLedgerStore } from './store';
import type { EventLedgerEntry, EventLedgerQuery, EventLedgerReplayResult } from './types';

function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function computeChecksum(data: any): string {
  // Simple checksum for integrity verification
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

class EventLedger {
  private lastEventId: string | null = null;

  /**
   * Log an event - MANDATORY for all AI actions
   */
  async log(
    entry: Omit<EventLedgerEntry, 'id' | 'timestamp' | 'checksum'>
  ): Promise<EventLedgerEntry> {
    const fullEntry: EventLedgerEntry = {
      id: generateEventId(),
      timestamp: Date.now(),
      previousEventId: this.lastEventId || undefined,
      checksum: computeChecksum(entry.data),
      ...entry,
    };

    // Set previous event reference for chain
    this.lastEventId = fullEntry.id;

    // Persist to store
    await eventLedgerStore.append(fullEntry);

    // Emit to event bus for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eventLedger:entry', { detail: fullEntry }));
    }

    return fullEntry;
  }

  /**
   * Query events
   */
  async query(query: EventLedgerQuery): Promise<EventLedgerEntry[]> {
    return eventLedgerStore.query(query);
  }

  /**
   * Get all events for a job
   */
  async getByJobId(jobId: string): Promise<EventLedgerEntry[]> {
    return eventLedgerStore.getByJobId(jobId);
  }

  /**
   * Get last event (for resumption)
   */
  async getLastEvent(jobId?: string): Promise<EventLedgerEntry | null> {
    return eventLedgerStore.getLastEvent(jobId);
  }

  /**
   * Replay events - rebuild state from ledger
   */
  async replay(jobId: string): Promise<EventLedgerReplayResult> {
    const entries = await this.getByJobId(jobId);

    // Sort by timestamp (oldest first for replay)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    const finalState: Record<string, any> = {};
    const errors: Array<{ entryId: string; error: string }> = [];

    for (const entry of entries) {
      try {
        // Apply event to state
        this.applyEventToState(entry, finalState);
      } catch (error) {
        errors.push({
          entryId: entry.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      entries,
      finalState,
      errors,
    };
  }

  /**
   * Apply an event to state (for replay)
   */
  private applyEventToState(entry: EventLedgerEntry, state: Record<string, any>): void {
    switch (entry.type) {
      case 'ai:action:start':
        state[`action:${entry.data.action}`] = {
          status: 'started',
          timestamp: entry.timestamp,
          ...entry.data,
        };
        break;

      case 'ai:action:complete':
        if (state[`action:${entry.data.action}`]) {
          state[`action:${entry.data.action}`].status = 'completed';
          state[`action:${entry.data.action}`].result = entry.data.result;
        }
        break;

      case 'job:checkpoint':
        state.jobCheckpoint = entry.stateSnapshot;
        break;

      case 'context:save':
        state.context = entry.data.context;
        break;

      default:
        // Store all events in state for inspection
        if (!state.events) state.events = [];
        state.events.push(entry);
    }
  }

  /**
   * Get ActionLog entries for UI (formatted for ActionLog component)
   */
  async getActionLogEntries(jobId: string): Promise<
    Array<{
      id: string;
      timestamp: number;
      userSaid: string;
      regenUnderstood: {
        intent: string;
        confidence: number;
        alternatives?: string[];
      };
      decision: {
        action: string;
        reasoning: string;
        constraints: string[];
      };
      context: {
        sources: string[];
        lastMemory?: string;
        mode: string;
      };
      result?: {
        success: boolean;
        output?: string;
        error?: string;
      };
      linkedStep?: {
        jobId?: string;
        stepName: string;
        progress?: number;
      };
    }>
  > {
    const entries = await this.getByJobId(jobId);
    const actionEntries = entries.filter(
      e => e.type === 'ai:reasoning' || e.type === 'ai:decision'
    );

    return actionEntries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      userSaid: entry.data.userInput || entry.data.query || '',
      regenUnderstood: {
        intent: entry.data.intent || entry.data.action || '',
        confidence: entry.confidence || 0.5,
        alternatives: entry.data.alternatives,
      },
      decision: {
        action: entry.data.action || '',
        reasoning: entry.reasoning || entry.data.reasoning || '',
        constraints: entry.data.constraints || [],
      },
      context: {
        sources: entry.sources || [],
        lastMemory: entry.data.memory,
        mode: entry.data.mode || 'unknown',
      },
      result: entry.data.result
        ? {
            success: !entry.data.error,
            output: entry.data.result,
            error: entry.data.error,
          }
        : undefined,
      linkedStep: entry.jobId
        ? {
            jobId: entry.jobId,
            stepName: entry.data.step || '',
            progress: entry.data.progress,
          }
        : undefined,
    }));
  }

  /**
   * Clear all events (use with caution)
   */
  async clear(): Promise<void> {
    await eventLedgerStore.clear();
    this.lastEventId = null;
  }
}

export const eventLedger = new EventLedger();

// Export types
export type { EventLedgerEntry, EventLedgerQuery, EventLedgerReplayResult } from './types';
