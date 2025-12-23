/**
 * AI Engine Wrapper with Determinism
 *
 * Wraps aiEngine.runTask to automatically:
 * - Create jobs
 * - Log to Event Ledger
 * - Track confidence + sources
 * - Enable resumability
 *
 * Usage:
 *
 * ```ts
 * import { aiEngine } from '@/core/ai/engine';
 * import { withDeterminism } from '@/core/ai/withDeterminism';
 *
 * // Instead of: aiEngine.runTask(...)
 * const result = await withDeterminism(aiEngine.runTask.bind(aiEngine), {
 *   userId: 'user-123',
 *   type: 'research',
 *   query: 'What is AI?',
 *   confidence: 0.9,
 *   sources: ['source1', 'source2'],
 *   reasoning: 'User requested research query'
 * })(taskRequest, onStream);
 * ```
 */

import { executeAIOperation } from './integration';
import type { AITaskRequest, AITaskResult } from './engine';

export interface DeterminismOptions {
  userId: string;
  type: 'research' | 'trade' | 'analysis' | 'agent' | 'skill';
  query?: string;
  confidence?: number;
  sources?: string[];
  reasoning?: string;
  data?: Record<string, any>;
}

type AITaskRunner = (
  request: AITaskRequest,
  onStream?: Parameters<typeof import('./engine').aiEngine.runTask>[1]
) => Promise<AITaskResult>;

/**
 * Wrap AI task runner with determinism
 */
export function withDeterminism(runner: AITaskRunner, options: DeterminismOptions) {
  return async (
    request: AITaskRequest,
    onStream?: Parameters<AITaskRunner>[1]
  ): Promise<AITaskResult & { jobId: string }> => {
    // Extract query from request
    const query = options.query || request.prompt || '';

    // Execute with full determinism
    const result = await executeAIOperation(
      async _ctx => {
        // Run the actual AI task
        return runner(request, onStream);
      },
      {
        userId: options.userId,
        type: options.type,
        query,
        data: {
          ...options.data,
          kind: request.kind,
          mode: request.mode,
          context: request.context,
        },
        confidence: options.confidence,
        sources: options.sources,
        reasoning:
          options.reasoning || `Executing ${request.kind} task: ${query.substring(0, 50)}...`,
      }
    );

    return {
      ...result.result,
      jobId: result.jobId,
    };
  };
}

/**
 * Helper to extract confidence from AI result
 * (if the AI provider returns confidence scores)
 */
export function extractConfidence(result: AITaskResult): number {
  // Try to extract from citations (more citations = higher confidence)
  if (result.citations && result.citations.length > 0) {
    return Math.min(0.9, 0.5 + result.citations.length * 0.1);
  }

  // Default confidence based on provider
  if (result.provider === 'ollama') {
    return 0.7; // Local models slightly lower confidence
  }

  return 0.8; // Cloud models default
}

/**
 * Helper to extract sources from AI result
 */
export function extractSources(result: AITaskResult): string[] {
  const sources: string[] = [];

  // From citations
  if (result.citations) {
    for (const citation of result.citations) {
      if (citation.url) sources.push(citation.url);
      if (citation.source) sources.push(citation.source);
    }
  }

  // From model/provider
  sources.push(`${result.provider}/${result.model}`);

  return sources;
}
