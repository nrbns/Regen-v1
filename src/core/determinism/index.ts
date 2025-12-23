/**
 * Determinism System - Central Exports
 *
 * This is the foundation that makes Regen unbeatable.
 *
 * Quick start:
 *
 * ```ts
 * import { eventLedger, jobAuthority, contextContinuity, skillsEngine } from '@/core/determinism';
 *
 * // Create job
 * const job = await jobAuthority.createJob({ userId, type: 'research', query });
 *
 * // Log event
 * await eventLedger.log({ type: 'ai:action:start', jobId: job.jobId, userId, data: {...} });
 *
 * // Save context
 * await contextContinuity.save({ userId, mode: 'research', ... });
 *
 * // Save skill
 * await skillsEngine.saveFromJob(job.jobId, { name: 'Research Skill' });
 * ```
 */

// Event Ledger - The audit trail
export { eventLedger } from '../eventLedger';
export type { EventLedgerEntry, EventLedgerQuery, EventLedgerReplayResult } from '../eventLedger';

// Job Authority - Enforced everywhere
export { jobAuthority } from '../jobAuthority';
export type { JobContext, JobCheckpoint } from '../jobAuthority';

// Context Continuity - Never lose context
export { contextContinuity } from '../contextContinuity';
export type { ContextSnapshot } from '../contextContinuity';

// Skills Engine - Reusable capabilities
export { skillsEngine } from '../skills/engine';
export type { SavedSkill } from '../skills/engine';

// AI Integration Helpers
export { executeAIOperation, logAIReasoning, logAIDecision } from '../ai/integration';
export type { AIOperationOptions, AIOperationResult } from '../ai/integration';

// Determinism Wrapper
export { withDeterminism, extractConfidence, extractSources } from '../ai/withDeterminism';
export type { DeterminismOptions } from '../ai/withDeterminism';
