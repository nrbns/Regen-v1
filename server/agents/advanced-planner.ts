/**
 * Advanced Agent Planner
 * Breaks down complex tasks into executable steps with dependencies
 */

// import { type ResearchAgentQuery } from './researchAgent'; // Unused

export interface TaskStep {
  id: string;
  type: 'search' | 'fetch' | 'summarize' | 'analyze' | 'synthesize' | 'format';
  description: string;
  dependencies: string[]; // Step IDs this depends on
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface ExecutionPlan {
  id: string;
  query: string;
  steps: TaskStep[];
  estimatedTime: number; // seconds
  estimatedCost: number; // tokens/API calls
}

/**
 * Plan a research task
 */
export function planResearchTask(
  query: string,
  options: {
    includeCounterpoints?: boolean;
    maxSteps?: number;
    complexity?: 'simple' | 'medium' | 'complex';
  } = {}
): ExecutionPlan {
  const { includeCounterpoints = false, maxSteps = 10, complexity = 'medium' } = options;

  const steps: TaskStep[] = [];
  let stepId = 1;

  // Step 1: Initial search
  steps.push({
    id: `step-${stepId++}`,
    type: 'search',
    description: `Search for: ${query}`,
    dependencies: [],
    inputs: { query },
    status: 'pending',
  });

  // Step 2: Fetch top results
  steps.push({
    id: `step-${stepId++}`,
    type: 'fetch',
    description: 'Fetch content from top search results',
    dependencies: [`step-${stepId - 2}`],
    inputs: { count: 5 },
    status: 'pending',
  });

  // Step 3: Summarize fetched content
  steps.push({
    id: `step-${stepId++}`,
    type: 'summarize',
    description: 'Summarize fetched documents',
    dependencies: [`step-${stepId - 2}`],
    inputs: { maxLength: 200 },
    status: 'pending',
  });

  // Step 4: Analyze (if complex)
  if (complexity !== 'simple') {
    steps.push({
      id: `step-${stepId++}`,
      type: 'analyze',
      description: 'Analyze and extract key insights',
      dependencies: [`step-${stepId - 2}`],
      inputs: {},
      status: 'pending',
    });
  }

  // Step 5: Counterpoints (if requested)
  if (includeCounterpoints) {
    steps.push({
      id: `step-${stepId++}`,
      type: 'search',
      description: 'Search for counterpoints and alternative views',
      dependencies: [`step-${stepId - 4}`],
      inputs: { query: `counterpoints to ${query}` },
      status: 'pending',
    });
  }

  // Step 6: Synthesize final answer
  steps.push({
    id: `step-${stepId++}`,
    type: 'synthesize',
    description: 'Synthesize information into final answer',
    dependencies: steps.filter(s => s.type === 'summarize' || s.type === 'analyze').map(s => s.id),
    inputs: {},
    status: 'pending',
  });

  // Step 7: Format response
  steps.push({
    id: `step-${stepId++}`,
    type: 'format',
    description: 'Format final response with citations',
    dependencies: [`step-${stepId - 2}`],
    inputs: { format: 'markdown' },
    status: 'pending',
  });

  // Limit steps
  const finalSteps = steps.slice(0, maxSteps);

  // Calculate estimates
  const estimatedTime = estimateExecutionTime(finalSteps, complexity);
  const estimatedCost = estimateCost(finalSteps);

  return {
    id: `plan-${Date.now()}`,
    query,
    steps: finalSteps,
    estimatedTime,
    estimatedCost,
  };
}

/**
 * Estimate execution time in seconds
 */
function estimateExecutionTime(steps: TaskStep[], complexity: string): number {
  const timePerStep: Record<string, number> = {
    search: 2,
    fetch: 3,
    summarize: 5,
    analyze: 8,
    synthesize: 10,
    format: 2,
  };

  const complexityMultiplier: Record<string, number> = {
    simple: 1,
    medium: 1.5,
    complex: 2,
  };

  const baseTime = steps.reduce((sum, step) => sum + (timePerStep[step.type] || 3), 0);
  return Math.round(baseTime * complexityMultiplier[complexity]);
}

/**
 * Estimate cost (API calls/tokens)
 */
function estimateCost(steps: TaskStep[]): number {
  const costPerStep: Record<string, number> = {
    search: 10, // API calls
    fetch: 5, // API calls
    summarize: 500, // tokens
    analyze: 1000, // tokens
    synthesize: 1500, // tokens
    format: 100, // tokens
  };

  return steps.reduce((sum, step) => sum + (costPerStep[step.type] || 0), 0);
}

/**
 * Validate execution plan
 */
export function validatePlan(plan: ExecutionPlan): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for circular dependencies
  const stepIds = new Set(plan.steps.map(s => s.id));
  for (const step of plan.steps) {
    for (const dep of step.dependencies) {
      if (!stepIds.has(dep)) {
        errors.push(`Step ${step.id} depends on missing step: ${dep}`);
      }
      if (dep === step.id) {
        errors.push(`Step ${step.id} has circular dependency on itself`);
      }
    }
  }

  // Check for orphaned steps
  const referencedSteps = new Set<string>();
  for (const step of plan.steps) {
    step.dependencies.forEach(dep => referencedSteps.add(dep));
  }

  const rootSteps = plan.steps.filter(s => s.dependencies.length === 0);
  if (rootSteps.length === 0) {
    errors.push('No root steps (steps without dependencies)');
  }

  // Check for unreachable steps
  const reachableSteps = new Set<string>();
  function markReachable(stepId: string) {
    if (reachableSteps.has(stepId)) return;
    reachableSteps.add(stepId);
    const step = plan.steps.find(s => s.id === stepId);
    if (step) {
      step.dependencies.forEach(dep => markReachable(dep));
    }
  }

  rootSteps.forEach(s => markReachable(s.id));

  for (const step of plan.steps) {
    if (!reachableSteps.has(step.id)) {
      warnings.push(`Step ${step.id} is unreachable from root steps`);
    }
  }

  // Cost/time warnings
  if (plan.estimatedTime > 60) {
    warnings.push(`Estimated execution time is high: ${plan.estimatedTime}s`);
  }
  if (plan.estimatedCost > 5000) {
    warnings.push(`Estimated cost is high: ${plan.estimatedCost} tokens/calls`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Optimize execution plan
 */
export function optimizePlan(plan: ExecutionPlan): ExecutionPlan {
  // Remove unreachable steps
  const reachableSteps = new Set<string>();
  function markReachable(stepId: string) {
    if (reachableSteps.has(stepId)) return;
    reachableSteps.add(stepId);
    const step = plan.steps.find(s => s.id === stepId);
    if (step) {
      step.dependencies.forEach(dep => markReachable(dep));
    }
  }

  const rootSteps = plan.steps.filter(s => s.dependencies.length === 0);
  rootSteps.forEach(s => markReachable(s.id));

  const optimizedSteps = plan.steps.filter(s => reachableSteps.has(s.id));

  // Parallelize independent steps where possible
  // (This is a simplified version - real optimization would use DAG analysis)

  return {
    ...plan,
    steps: optimizedSteps,
    estimatedTime: estimateExecutionTime(optimizedSteps, 'medium'),
    estimatedCost: estimateCost(optimizedSteps),
  };
}
