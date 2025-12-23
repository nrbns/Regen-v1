/**
 * Event Ledger - The Foundation of Determinism
 *
 * Every AI action MUST be logged here. This is non-negotiable.
 * Without this, you cannot have:
 * - Replayability
 * - Resumability
 * - Explainability
 * - Trust
 *
 * This is why Linux won.
 */

export type EventLedgerEntryType =
  | 'ai:action:start'
  | 'ai:action:complete'
  | 'ai:action:error'
  | 'ai:reasoning'
  | 'ai:decision'
  | 'context:switch'
  | 'context:save'
  | 'context:restore'
  | 'job:create'
  | 'job:checkpoint'
  | 'job:resume'
  | 'job:complete'
  | 'skill:execute'
  | 'skill:create'
  | 'user:input'
  | 'system:state';

export interface EventLedgerEntry {
  /** Unique event ID - used for replay */
  id: string;

  /** Event type */
  type: EventLedgerEntryType;

  /** Timestamp (ms since epoch) */
  timestamp: number;

  /** Job ID this event belongs to (if any) */
  jobId?: string;

  /** User ID */
  userId: string;

  /** Event data - structured payload */
  data: Record<string, any>;

  /** Confidence score (0-1) for AI decisions */
  confidence?: number;

  /** Sources/references for AI reasoning */
  sources?: string[];

  /** Reasoning/explanation - WHY this happened */
  reasoning?: string;

  /** State snapshot at this point (for replay) */
  stateSnapshot?: Record<string, any>;

  /** Previous event ID (for chain) */
  previousEventId?: string;

  /** Checksum for integrity verification */
  checksum?: string;
}

export interface EventLedgerQuery {
  jobId?: string;
  userId?: string;
  type?: EventLedgerEntryType | EventLedgerEntryType[];
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface EventLedgerReplayResult {
  entries: EventLedgerEntry[];
  finalState: Record<string, any>;
  errors: Array<{ entryId: string; error: string }>;
}
