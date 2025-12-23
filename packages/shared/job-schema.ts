/**
 * Job Schema Versioning
 * Contract between frontend, backend, and workers
 *
 * CRITICAL: This is your API contract
 * When you change this, you must bump the version
 * Old versions are supported for backward compatibility
 */

/**
 * Job Schema V1 (Current)
 * Defines the shape of a job record
 */
export const JOB_SCHEMA_V1 = {
  version: 1,
  lastUpdated: '2025-12-19',
  description: 'Initial job schema - research, trade, analysis',

  required: ['id', 'userId', 'type', 'state', 'progress', 'step', 'createdAt', 'lastActivity'],

  example: {
    id: 'job-1703000000000-abc123',
    userId: 'user-uuid-123',
    type: 'research', // 'research' | 'trade' | 'analysis'
    state: 'running', // 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
    query: 'What is quantum computing?',
    progress: 45, // 0-100
    step: 'Analyzing sources',
    createdAt: 1703000000000,
    startedAt: 1703000001000,
    completedAt: undefined,
    failedAt: undefined,
    error: undefined,
    result: undefined,
    checkpointData: undefined,
    lastActivity: 1703000045000,
  },

  fields: {
    id: {
      type: 'string',
      description: 'Unique job ID (UUID or timestamp-based)',
      immutable: true,
    },
    userId: {
      type: 'string',
      description: 'Owner of the job',
      immutable: true,
    },
    type: {
      type: "'research' | 'trade' | 'analysis'",
      description: 'Job type determines worker routing',
      immutable: true,
    },
    state: {
      type: "'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'",
      description: 'Current job state',
      mutable: true,
    },
    query: {
      type: 'string | undefined',
      description: 'User input / instruction',
      mutable: false,
    },
    progress: {
      type: 'number (0-100)',
      description: 'Completion percentage',
      mutable: true,
    },
    step: {
      type: 'string',
      description: 'Human-readable current step',
      mutable: true,
    },
    createdAt: {
      type: 'number (timestamp ms)',
      description: 'When job was created',
      immutable: true,
    },
    startedAt: {
      type: 'number | undefined',
      description: 'When job entered running state',
      mutable: false,
    },
    completedAt: {
      type: 'number | undefined',
      description: 'When job entered completed state',
      mutable: false,
    },
    failedAt: {
      type: 'number | undefined',
      description: 'When job entered failed state',
      mutable: false,
    },
    error: {
      type: 'string | undefined',
      description: 'Error message (if state = failed)',
      mutable: false,
    },
    result: {
      type: 'any',
      description: 'Final result (if state = completed)',
      mutable: false,
    },
    checkpointData: {
      type: 'Record<string, any> | undefined',
      description: 'Resumable state (if state = paused)',
      mutable: true,
    },
    lastActivity: {
      type: 'number (timestamp ms)',
      description: 'Last heartbeat from worker (for stale detection)',
      mutable: true,
    },
  },

  invariants: [
    'state is never set backwards (only forward transitions)',
    'Once completed/failed/cancelled, state cannot change',
    'result is only set when state = completed',
    'error is only set when state = failed',
    'checkpointData is only set when state = paused',
    'startedAt is set when state transitions to running',
  ],
} as const;

/**
 * Job Schema V2 (Future)
 * Reserved for planned changes - do NOT use yet
 *
 * Planned additions:
 * - tags: string[] (for categorization)
 * - parentJobId: string | undefined (for sub-jobs)
 * - timeout: number (max duration)
 * - retryCount: number
 * - metadata: Record<string, string> (custom fields)
 */
export const JOB_SCHEMA_V2_PLAN = {
  version: 2,
  description: 'Future schema - not yet implemented',
  changes: [
    'Add tags field',
    'Add parent job support',
    'Add timeout',
    'Add retry count',
    'Add metadata object',
  ],
} as const;

/**
 * Runtime validation function
 * Use to validate job records from external sources
 */
export function validateJobRecord(job: any): {
  valid: boolean;
  errors: string[];
  schema: number;
} {
  const errors: string[] = [];
  const schema = 1; // Current schema version

  // Check required fields
  for (const field of JOB_SCHEMA_V1.required) {
    if (!(field in job)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check field types
  if (job.id && typeof job.id !== 'string') errors.push('id must be string');
  if (job.userId && typeof job.userId !== 'string') errors.push('userId must be string');
  if (job.type && !['research', 'trade', 'analysis'].includes(job.type)) {
    errors.push('type must be research | trade | analysis');
  }
  if (
    job.state &&
    !['created', 'running', 'paused', 'completed', 'failed', 'cancelled'].includes(job.state)
  ) {
    errors.push('state must be created | running | paused | completed | failed | cancelled');
  }
  if (
    job.progress &&
    (typeof job.progress !== 'number' || job.progress < 0 || job.progress > 100)
  ) {
    errors.push('progress must be number 0-100');
  }
  if (job.step && typeof job.step !== 'string') errors.push('step must be string');
  if (job.createdAt && typeof job.createdAt !== 'number') errors.push('createdAt must be number');

  return {
    valid: errors.length === 0,
    errors,
    schema,
  };
}

/**
 * Schema migration helper
 * Use if you need to upgrade records between versions
 */
export function migrateJobRecord(job: any, fromVersion: number, toVersion: number) {
  if (fromVersion === 1 && toVersion === 2) {
    // Example migration to V2
    return {
      ...job,
      tags: [],
      parentJobId: undefined,
      timeout: 3600000, // 1 hour default
      retryCount: 0,
      metadata: {},
    };
  }

  throw new Error(`Migration from schema ${fromVersion} to ${toVersion} not implemented`);
}

/**
 * Export for consumers
 */
export const JOB_SCHEMA = JOB_SCHEMA_V1;
export type JobSchemaVersion = typeof JOB_SCHEMA_V1.version;
