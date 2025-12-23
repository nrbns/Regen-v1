/**
 * AI Integration Helpers - Wire Event Ledger Everywhere
 *
 * This ensures ALL AI operations:
 * - Go through Job Authority
 * - Are logged to Event Ledger
 * - Have confidence + sources
 * - Are resumable
 */

import { eventLedger } from '../eventLedger';
import { jobAuthority } from '../jobAuthority';
import type { EventLedgerEntry } from '../eventLedger/types';

export interface AIOperationOptions {
  userId: string;
  type: 'research' | 'trade' | 'analysis' | 'agent' | 'skill';
  query: string;
  data?: Record<string, any>;
  /** Confidence score (0-1) - MANDATORY */
  confidence?: number;
  /** Sources/references - MANDATORY */
  sources?: string[];
  /** Reasoning/explanation - MANDATORY */
  reasoning?: string;
}

export interface AIOperationResult<T = any> {
  result: T;
  jobId: string;
  confidence: number;
  sources: string[];
}

/**
 * Execute AI operation with full determinism
 */
export async function executeAIOperation<T>(
  operation: (ctx: { jobId: string; query: string; data?: Record<string, any> }) => Promise<T>,
  options: AIOperationOptions
): Promise<AIOperationResult<T>> {
  // 1. Create job (Job Authority)
  const job = await jobAuthority.createJob({
    userId: options.userId,
    type: options.type,
    query: options.query,
    data: options.data,
  });

  // 2. Log reasoning
  await eventLedger.log({
    type: 'ai:reasoning',
    jobId: job.jobId,
    userId: options.userId,
    data: {
      query: options.query,
      intent: options.query, // TODO: Extract intent
      ...options.data,
    },
    confidence: options.confidence ?? 0.5,
    sources: options.sources ?? [],
    reasoning: options.reasoning || `Processing ${options.type} operation`,
  });

  try {
    // 3. Execute with checkpoint support
    const result = await jobAuthority.executeWithJob(job.jobId, async ctx => {
      return operation({
        jobId: ctx.jobId,
        query: ctx.query || options.query,
        data: ctx.data,
      });
    });

    // 4. Log decision/result
    await eventLedger.log({
      type: 'ai:decision',
      jobId: job.jobId,
      userId: options.userId,
      data: {
        action: options.type,
        result,
      },
      confidence: options.confidence ?? 0.5,
      sources: options.sources ?? [],
      reasoning: options.reasoning || `Completed ${options.type} operation`,
    });

    // 5. Complete job
    await jobAuthority.complete(job.jobId, result);

    return {
      result,
      jobId: job.jobId,
      confidence: options.confidence ?? 0.5,
      sources: options.sources ?? [],
    };
  } catch (error) {
    // Log error
    await eventLedger.log({
      type: 'ai:action:error',
      jobId: job.jobId,
      userId: options.userId,
      data: {
        error: error instanceof Error ? error.message : String(error),
        type: options.type,
        query: options.query,
      },
      reasoning: `Failed ${options.type} operation`,
    });

    throw error;
  }
}

/**
 * Log AI reasoning with mandatory fields
 */
export async function logAIReasoning(params: {
  jobId: string;
  userId: string;
  userInput: string;
  intent: string;
  confidence: number;
  alternatives?: string[];
  reasoning: string;
  sources: string[];
  mode?: string;
}): Promise<EventLedgerEntry> {
  return eventLedger.log({
    type: 'ai:reasoning',
    jobId: params.jobId,
    userId: params.userId,
    data: {
      userInput: params.userInput,
      intent: params.intent,
      alternatives: params.alternatives,
      mode: params.mode,
    },
    confidence: params.confidence,
    sources: params.sources,
    reasoning: params.reasoning,
  });
}

/**
 * Log AI decision with mandatory fields
 */
export async function logAIDecision(params: {
  jobId: string;
  userId: string;
  action: string;
  reasoning: string;
  constraints?: string[];
  confidence: number;
  sources: string[];
  result?: any;
}): Promise<EventLedgerEntry> {
  return eventLedger.log({
    type: 'ai:decision',
    jobId: params.jobId,
    userId: params.userId,
    data: {
      action: params.action,
      constraints: params.constraints,
      result: params.result,
    },
    confidence: params.confidence,
    sources: params.sources,
    reasoning: params.reasoning,
  });
}
