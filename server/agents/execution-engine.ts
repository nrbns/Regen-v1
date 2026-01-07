/**
 * Advanced Agent Execution Engine
 * Executes agent plans with dependency resolution, parallelism, and error handling
 */

import { type ExecutionPlan, type TaskStep } from './advanced-planner';
// import { executeResearchAgent } from './researchAgent'; // Unused

export interface ExecutionContext {
  plan: ExecutionPlan;
  stepResults: Map<string, any>;
  stepErrors: Map<string, string>;
  startTime: number;
}

export interface ExecutionResult {
  success: boolean;
  plan: ExecutionPlan;
  results: Map<string, any>;
  errors: Map<string, string>;
  executionTime: number;
  completedSteps: string[];
  failedSteps: string[];
}

/**
 * Execute an agent plan
 */
export async function executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
  const context: ExecutionContext = {
    plan,
    stepResults: new Map(),
    stepErrors: new Map(),
    startTime: Date.now(),
  };

  const completedSteps: string[] = [];
  const failedSteps: string[] = [];

  // Execute steps in dependency order
  const executed = new Set<string>();

  // Topological sort: execute steps based on dependencies
  while (executed.size < plan.steps.length) {
    // Find steps that can be executed (all dependencies completed)
    const readySteps = plan.steps.filter(
      step => !executed.has(step.id) && step.dependencies.every(dep => executed.has(dep) || !dep)
    );

    if (readySteps.length === 0) {
      // Circular dependency or missing dependency
      const remaining = plan.steps.filter(s => !executed.has(s.id));
      for (const step of remaining) {
        context.stepErrors.set(step.id, 'Missing or circular dependency');
        failedSteps.push(step.id);
      }
      break;
    }

    // Execute ready steps in parallel
    const stepPromises = readySteps.map(step => executeStep(step, context));
    const stepResults = await Promise.allSettled(stepPromises);

    // Process results
    for (let i = 0; i < readySteps.length; i++) {
      const step = readySteps[i];
      const result = stepResults[i];

      if (result.status === 'fulfilled') {
        context.stepResults.set(step.id, result.value);
        executed.add(step.id);
        completedSteps.push(step.id);
        step.status = 'completed';
      } else {
        context.stepErrors.set(step.id, result.reason?.message || String(result.reason));
        executed.add(step.id);
        failedSteps.push(step.id);
        step.status = 'failed';
        step.error = result.reason?.message || String(result.reason);
      }
    }
  }

  return {
    success: failedSteps.length === 0,
    plan,
    results: context.stepResults,
    errors: context.stepErrors,
    executionTime: Date.now() - context.startTime,
    completedSteps,
    failedSteps,
  };
}

/**
 * Execute a single step
 */
async function executeStep(step: TaskStep, context: ExecutionContext): Promise<any> {
  step.status = 'running';

  try {
    switch (step.type) {
      case 'search':
        return await executeSearchStep(step, context);
      case 'fetch':
        return await executeFetchStep(step, context);
      case 'summarize':
        return await executeSummarizeStep(step, context);
      case 'analyze':
        return await executeAnalyzeStep(step, context);
      case 'synthesize':
        return await executeSynthesizeStep(step, context);
      case 'format':
        return await executeFormatStep(step, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  } catch (error: any) {
    step.status = 'failed';
    step.error = error.message || String(error);
    throw error;
  }
}

async function executeSearchStep(step: TaskStep, _context: ExecutionContext): Promise<any> {
  const query = step.inputs.query as string;

  const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
  const response = await fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: query,
      maxResults: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function executeFetchStep(step: TaskStep, context: ExecutionContext): Promise<any> {
  // Get search results from previous step
  const searchStepId = step.dependencies[0];
  const searchResults = context.stepResults.get(searchStepId);

  if (!searchResults || !Array.isArray(searchResults)) {
    throw new Error('No search results available');
  }

  const { extractContent } = await import('../lib/extractors.js');
  const urls = searchResults.slice(0, 5).map((r: any) => r.url);

  const contents = await Promise.all(
    urls.map((url: string) =>
      extractContent(url).catch((error: any) => ({
        url,
        error: error.message,
      }))
    )
  );

  return contents;
}

async function executeSummarizeStep(step: TaskStep, context: ExecutionContext): Promise<any> {
  // Get fetched content from previous step
  const fetchStepId = step.dependencies[0];
  const fetchedContents = context.stepResults.get(fetchStepId);

  if (!fetchedContents || !Array.isArray(fetchedContents)) {
    throw new Error('No content available for summarization');
  }

  const summaries = await Promise.all(
    fetchedContents.map(async (content: any) => {
      if (content.error) {
        return { url: content.url, summary: null, error: content.error };
      }

      try {
        const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:4000';
        const response = await fetch(`${API_BASE}/api/summarize/v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: [content.url],
            maxLength: step.inputs.maxLength || 200,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            url: content.url,
            summary: data.summaries?.[0]?.summary || data.summary,
          };
        }

        return { url: content.url, summary: null, error: 'Summarization failed' };
      } catch (error: any) {
        return { url: content.url, summary: null, error: error.message };
      }
    })
  );

  return summaries;
}

async function executeAnalyzeStep(step: TaskStep, context: ExecutionContext): Promise<any> {
  // Get summaries from previous step
  const summarizeStepId = step.dependencies[0];
  const summaries = context.stepResults.get(summarizeStepId);

  if (!summaries || !Array.isArray(summaries)) {
    throw new Error('No summaries available for analysis');
  }

  // Simple analysis: extract key insights
  const insights: string[] = [];
  const validSummaries = summaries.filter((s: any) => s.summary && !s.error);

  for (const summary of validSummaries) {
    // Extract sentences (simple heuristic)
    const sentences = summary.summary.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
    insights.push(...sentences.slice(0, 3));
  }

  return {
    insights: insights.slice(0, 10),
    sourceCount: validSummaries.length,
  };
}

async function executeSynthesizeStep(step: TaskStep, context: ExecutionContext): Promise<any> {
  // Collect results from all previous steps
  const summaries = step.dependencies
    .map(depId => {
      const result = context.stepResults.get(depId);
      if (Array.isArray(result)) {
        return result;
      }
      return null;
    })
    .filter(Boolean)
    .flat();

  const analysis = step.dependencies
    .map(depId => context.stepResults.get(depId))
    .find(r => r && typeof r === 'object' && 'insights' in r);

  // Synthesize into final answer
  const synthesis = {
    summary: summaries
      .map((s: any) => s.summary)
      .filter(Boolean)
      .join('\n\n'),
    insights: analysis?.insights || [],
    sources: summaries.length,
  };

  return synthesis;
}

async function executeFormatStep(step: TaskStep, context: ExecutionContext): Promise<any> {
  // Get synthesis from previous step
  const synthesizeStepId = step.dependencies[0];
  const synthesis = context.stepResults.get(synthesizeStepId);

  if (!synthesis) {
    throw new Error('No synthesis available for formatting');
  }

  const format = step.inputs.format || 'report';

  switch (format) {
    case 'markdown':
      return formatAsMarkdown(synthesis);
    case 'json':
      return JSON.stringify(synthesis, null, 2);
    default:
      return synthesis;
  }
}

function formatAsMarkdown(synthesis: any): string {
  let markdown = '# Research Report\n\n';
  markdown += `## Summary\n\n${synthesis.summary}\n\n`;

  if (synthesis.insights && synthesis.insights.length > 0) {
    markdown += `## Key Insights\n\n`;
    synthesis.insights.forEach((insight: string) => {
      markdown += `- ${insight}\n`;
    });
    markdown += '\n';
  }

  markdown += `\n---\n*Based on ${synthesis.sources} source(s)*\n`;

  return markdown;
}
