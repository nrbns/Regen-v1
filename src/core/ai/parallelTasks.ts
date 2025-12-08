/**
 * Parallel AI Task Execution
 * Allows running multiple independent AI tasks simultaneously (e.g., reasoning + summarization)
 * This significantly speeds up AI responses by parallelizing independent operations
 */

import { aiEngine, type AITaskRequest, type AITaskResult } from './engine';

export interface ParallelTaskResult<T = AITaskResult> {
  results: T[];
  totalLatency: number;
  fastestTask: number;
  slowestTask: number;
}

/**
 * Run reasoning and summarization in parallel
 * This is a common pattern where both tasks are independent and can run simultaneously
 */
export async function runReasoningAndSummarization(
  prompt: string,
  context?: Record<string, unknown>
): Promise<{
  reasoning: AITaskResult;
  summary: AITaskResult;
  latency: number;
}> {
  const startTime = Date.now();

  // Create parallel tasks
  const reasoningTask: AITaskRequest = {
    kind: 'agent',
    prompt: `Reason step-by-step about: ${prompt}`,
    context,
    llm: {
      temperature: 0.3, // Lower temperature for more consistent reasoning
      maxTokens: 1000,
    },
  };

  const summaryTask: AITaskRequest = {
    kind: 'summary',
    prompt: `Summarize the key points about: ${prompt}`,
    context,
    llm: {
      temperature: 0.5, // Slightly higher for more natural summaries
      maxTokens: 500,
    },
  };

  // Execute in parallel
  const [reasoning, summary] = await aiEngine.runParallelTasks([reasoningTask, summaryTask]);

  const latency = Date.now() - startTime;

  return {
    reasoning,
    summary,
    latency,
  };
}

/**
 * Run multiple independent AI tasks in parallel
 */
export async function runParallelTasks(
  requests: AITaskRequest[]
): Promise<ParallelTaskResult> {
  const startTime = Date.now();

  const results = await aiEngine.runParallelTasks(requests);

  const latencies = results.map(r => r.latency || 0).filter(l => l > 0);
  const totalLatency = Date.now() - startTime;
  const fastestTask = latencies.length > 0 ? Math.min(...latencies) : 0;
  const slowestTask = latencies.length > 0 ? Math.max(...latencies) : 0;

  return {
    results,
    totalLatency,
    fastestTask,
    slowestTask,
  };
}

/**
 * Run research analysis tasks in parallel
 * Common pattern: analyze multiple sources simultaneously
 */
export async function runParallelResearchAnalysis(
  sources: Array<{ title: string; content: string; url?: string }>,
  query: string
): Promise<Array<{ source: typeof sources[0]; analysis: AITaskResult }>> {
  const tasks: AITaskRequest[] = sources.map(source => ({
    kind: 'agent' as const,
    prompt: `Analyze this source in relation to: ${query}\n\nSource: ${source.title}\n${source.content.substring(0, 2000)}`,
    context: { url: source.url },
    llm: {
      temperature: 0.4,
      maxTokens: 300,
    },
  }));

  const results = await aiEngine.runParallelTasks(tasks);

  return sources.map((source, index) => ({
    source,
    analysis: results[index],
  }));
}

